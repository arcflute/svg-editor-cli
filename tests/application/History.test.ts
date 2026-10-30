import { describe, expect, it, vi } from 'vitest';
import { HistoryEntry } from '../../src/application/HistoryEntry.js';
import { HistoryManager } from '../../src/application/HistoryManager.js';
import { MoveCommand } from '../../src/application/MoveCommand.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { Text } from '../../src/domain/Text.js';
import { createEditor } from '../helpers/createEditor.js';

describe('history and session transactions', () => {
  it('guards absent documents, enforces init barriers and distinguishes ordinary empty stacks', () => {
    const { run, session } = createEditor();
    for (const command of ['undo', 'redo']) expect(() => run(command)).toThrow("no document. use 'init' or 'read' first");
    run('init');
    expect(session.readHistoryStatus()).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    for (const command of ['undo', 'redo']) expect(() => run(command)).toThrow(/^undo not allowed after io command$/);
    run('create g g1');
    expect(() => run('redo')).toThrow(/^nothing to redo$/);
    expect(run('undo')).toEqual(['undone: create g#g1']);
    expect(session.readTree().nodes).toEqual([]);
    expect(() => run('undo')).toThrow(/^nothing to undo$/);
    expect(run('redo')).toEqual(['g#g1 created']);
    expect(session.readShape('g1').parent).toBe('svg');
    const status = session.readHistoryStatus();
    expect(() => Object.assign(status, { blocked: true })).toThrow(TypeError);
    expect(session.readHistoryStatus()).toEqual({ undoCount: 1, redoCount: 0, blocked: false });
  });

  it('undoes and redoes an entire sequence one successful editing command at a time', () => {
    const { run, session } = createEditor();
    run('init 400 300');
    const states = [session.readTree()];
    const edits = ['create rect r 1 2 3 4', 'move r 5 6', 'scale r 2', 'set r fill red', 'delete r'];
    for (const line of edits) { run(line); states.push(session.readTree()); }
    expect(states[3]!.nodes[0]!.shape.attributes).toEqual({ x: 12, y: 16, width: 6, height: 8 });
    expect(session.readHistoryStatus()).toEqual({ undoCount: 5, redoCount: 0, blocked: false });
    for (let i = edits.length - 1; i >= 0; i--) {
      run('undo');
      expect(session.readTree()).toEqual(states[i]);
      expect(session.readHistoryStatus()).toEqual({ undoCount: i, redoCount: 5 - i, blocked: false });
    }
    for (let i = 1; i <= edits.length; i++) { run('redo'); expect(session.readTree()).toEqual(states[i]); }
    expect(() => run('redo')).toThrow('nothing to redo');
  });

  it('restores a deleted nested subtree at its original position with reusable behavior and index', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g outer', 'create g left in outer', 'create g target in outer',
      'create g nested in target', 'create rect r 1 2 3 4 in nested',
      'create text t 10 20 "中文 <&>" in target', 'create g right in outer']) run(line);
    const original = session.readTree();
    run('delete target');
    expect(session.readHistoryStatus().undoCount).toBe(8);
    run('undo');
    expect(session.readTree()).toEqual(original);
    expect(session.readShape('r').parent).toBe('g#nested');
    expect(session.readShape('t').parent).toBe('g#target');
    run('redo');
    expect(() => run('show r')).toThrow('no such shape: r');
    run('undo');
    run('move target 5 6');
    expect(session.readShape('r').shape.attributes).toEqual({ x: 6, y: 8, width: 3, height: 4 });
    expect(session.readShape('t').shape.attributes).toEqual({ x: 15, y: 26, text: '中文 <&>' });
    run('undo');
    expect(session.readTree()).toEqual(original);
    expect(session.readHistoryStatus().redoCount).toBe(1);
  });

  it('preserves missing styles and original text through repeated restores', () => {
    const { run, session } = createEditor();
    run('init'); run('create text t 1 2 "  原文 <&>  "');
    run('set t fill none'); run('set t stroke-width 0'); run('set t text ""');
    run('undo');
    expect(session.readShape('t').shape.attributes.text).toBe('  原文 <&>  ');
    run('undo'); run('undo');
    expect(session.readShape('t').shape.style).toEqual({});
    for (let i = 0; i < 3; i++) run('redo');
    expect(session.readShape('t').shape.style).toEqual({ fill: 'none', 'stroke-width': 0 });
    expect(session.readShape('t').shape.attributes.text).toBe('');
    run('undo'); run('redo');
    expect(session.readShape('t').shape.attributes.text).toBe('');
  });

  it.each(['move r NaN 1', 'move missing 1 1', 'scale r 0', 'scale r 1e308', 'set r width -1',
    'set r id changed', 'delete missing', 'create g r', 'create g fresh in missing', 'init 0 1',
    'undo extra', 'redo extra', 'create text t 0 0 "unclosed'])('preserves document and redo after failure: %s', line => {
    const { run, session } = createEditor();
    run('init'); run('create rect r 1 2 3 4'); run('move r 5 6'); run('undo');
    const before = { tree: session.readTree(), history: session.readHistoryStatus() };
    expect(() => run(line)).toThrow();
    expect({ tree: session.readTree(), history: session.readHistoryStatus() }).toEqual(before);
    run('redo');
    expect(session.readShape('r').shape.attributes).toEqual({ x: 6, y: 8, width: 3, height: 4 });
  });

  it.each(['create g fresh', 'move r 0 0', 'scale r 1', 'set r x 1', 'delete r'])('clears redo on a successful new edit, including no-ops: %s', edit => {
    const { run, session } = createEditor();
    run('init'); run('create rect r 1 2 3 4'); run('move r 2 3'); run('undo');
    run(edit);
    expect(session.readHistoryStatus()).toEqual({ undoCount: 2, redoCount: 0, blocked: false });
    expect(() => run('redo')).toThrow('nothing to redo');
    run('undo');
    expect(session.readShape('r').shape.attributes).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it('clears old history at init and unlocks only after the next successful edit', () => {
    const { run, session } = createEditor();
    run('init'); run('create g old'); run('move old 0 0'); run('undo');
    run('init 200 100');
    expect(session.readHistoryStatus()).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    expect(() => run('create circle bad 0 0 -1')).toThrow();
    expect(() => run('move old 1 1')).toThrow();
    expect(() => run('init -1 1')).toThrow();
    expect(() => run('undo')).toThrow('undo not allowed after io command');
    run('create g new'); run('undo');
    expect(session.readTree()).toEqual({ canvas: { width: 200, height: 100 }, nodes: [] });
    expect(() => run('undo')).toThrow('nothing to undo');
    run('redo');
    expect(session.readTree().nodes.map(n => n.shape.id)).toEqual(['new']);
  });

  it('keeps history unchanged for queries, blank lines, comments and their errors', () => {
    const { run, session } = createEditor();
    run('init');
    for (const line of ['help', 'tree', '', ' # comment']) run(line);
    expect(session.readHistoryStatus()).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    run('create g g1'); run('move g1 0 0'); run('undo');
    const before = { tree: session.readTree(), history: session.readHistoryStatus() };
    for (const line of ['help', 'tree', 'tree g1', 'show g1', '', '# ignored']) run(line);
    for (const line of ['show missing', 'tree missing', 'help extra', 'save x.svg', 'unknown']) expect(() => run(line)).toThrow();
    expect({ tree: session.readTree(), history: session.readHistoryStatus() }).toEqual(before);
  });

  it('records a whole-group transformation as one undo unit', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g outer', 'create g inner in outer', 'create rect r 1 2 3 4 in inner',
      'create text t 10 20 "文字" in outer']) run(line);
    const original = session.readTree();
    run('move outer 5 6');
    run('scale outer 2');
    expect(session.readHistoryStatus().undoCount).toBe(6);
    run('undo');
    expect(session.readShape('r').shape.attributes).toEqual({ x: 6, y: 8, width: 3, height: 4 });
    expect(session.readShape('t').shape.attributes).toEqual({ x: 15, y: 26, text: '文字' });
    run('undo');
    expect(session.readTree()).toEqual(original);
  });

  it('can reuse an ID freed by undo without resurrecting the old instance', () => {
    const { run, session } = createEditor();
    run('init'); run('create rect r 1 2 3 4'); run('undo'); run('create circle r 5 6 7');
    expect(() => run('redo')).toThrow('nothing to redo');
    run('undo'); run('redo'); run('scale r 2');
    expect(session.readShape('r').shape.attributes).toEqual({ cx: 10, cy: 12, r: 14 });
  });

  it('restores snapshots without executing the original command again', () => {
    const { run, session } = createEditor();
    run('init'); run('create rect r 1 2 3 4'); run('move r 5 6');
    const spy = vi.spyOn(MoveCommand.prototype, 'apply').mockImplementation(() => { throw new Error('must not re-execute'); });
    try {
      run('undo'); run('redo');
      expect(spy).not.toHaveBeenCalled();
      expect(session.readShape('r').shape.attributes.x).toBe(6);
    } finally { spy.mockRestore(); }
  });

  it('does not commit even when candidate mutation succeeds but snapshot creation fails', () => {
    const { run, session } = createEditor();
    run('init'); run('create g retained'); run('move retained 0 0'); run('undo');
    const before = { tree: session.readTree(), history: session.readHistoryStatus() };
    const clone = SvgDocument.prototype.clone;
    const spy = vi.spyOn(SvgDocument.prototype, 'clone').mockImplementation(function (this: SvgDocument) {
      if (this.find('fresh') !== undefined) throw new Error('snapshot failed');
      return clone.call(this);
    });
    try {
      expect(() => run('create g fresh')).toThrow('snapshot failed');
      expect({ tree: session.readTree(), history: session.readHistoryStatus() }).toEqual(before);
    } finally { spy.mockRestore(); }
    run('redo'); run('create g fresh');
    expect(session.readShape('fresh').parent).toBe('svg');
  });

  it('does not commit if history preparation throws after the edit and snapshots succeed', () => {
    const { run, session } = createEditor();
    run('init');
    const spy = vi.spyOn(HistoryManager.prototype, 'record').mockImplementationOnce(() => { throw new Error('history failed'); });
    try {
      expect(() => run('create g fresh')).toThrow('history failed');
      expect(session.readTree().nodes).toEqual([]);
      expect(session.readHistoryStatus()).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    } finally { spy.mockRestore(); }
    run('create g fresh');
    expect(session.readHistoryStatus().undoCount).toBe(1);
  });

  it.each(['undo', 'redo'])('preserves both stacks and active document on a failed %s restore', operation => {
    const { run, session } = createEditor();
    run('init'); run('create g g1');
    if (operation === 'redo') run('undo');
    const before = { tree: session.readTree(), history: session.readHistoryStatus() };
    const spy = vi.spyOn(SvgDocument.prototype, 'clone').mockImplementationOnce(() => { throw new Error('restore failed'); });
    try {
      expect(() => run(operation)).toThrow('restore failed');
      expect({ tree: session.readTree(), history: session.readHistoryStatus() }).toEqual(before);
    } finally { spy.mockRestore(); }
    run(operation);
    expect(session.readTree().nodes).toHaveLength(operation === 'undo' ? 0 : 1);
  });

  it('owns copies of before/after documents and returns fresh behavior-preserving restores', () => {
    const before = new SvgDocument(100, 200, [new Group('g1', [new Rect('r', 1, 2, 3, 4), new Text('t', 5, 6, '<&>')])]);
    const after = before.clone();
    after.require('g1').move(10, 20);
    const output = ['g#g1 moved by (10,20)'];
    const entry = new HistoryEntry(new MoveCommand('g1', 10, 20), before, after, output);
    before.remove('g1'); after.require('r').set('fill', 'red'); output[0] = 'changed outside';
    const restored = entry.restoreAfter();
    expect(restored.require('g1')).toBeInstanceOf(Group);
    expect(restored.require('r')).toBeInstanceOf(Rect);
    expect(restored.require('t')).toBeInstanceOf(Text);
    expect(restored.require('r').parent).toBe(restored.require('g1'));
    expect(restored.require('r').style).toEqual({});
    restored.require('g1').scale(2); restored.remove('r');
    expect(entry.restoreAfter().require('r').attributes).toEqual({ x: 11, y: 22, width: 3, height: 4 });
    expect(entry.restoreBefore().require('r').attributes).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(entry.redoOutput()).toEqual(['g#g1 moved by (10,20)']);
    expect(() => (entry.redoOutput() as string[]).push('bad')).toThrow(TypeError);
  });
});
