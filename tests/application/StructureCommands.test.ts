import { describe, expect, it } from 'vitest';
import { createEditor } from '../helpers/createEditor.js';

function scene() {
  const editor = createEditor();
  for (const line of ['init', 'create g scene', 'create g A in scene', 'create rect a1 1 2 3 4 in A',
    'create text a2 5 6 "甲" in A', 'create g B in scene', 'create circle b1 7 8 9 in B', 'create g b2 in B']) editor.run(line);
  const ids = (id?: string) => {
    const view = editor.session.readTree(id);
    return (id === undefined ? view.nodes : view.nodes[0]!.children).map(node => node.shape.id);
  };
  return { ...editor, ids };
}

describe('grouping and sibling ordering commands', () => {
  it('groups siblings in original order at the first selected position; undo/redo is one unit', () => {
    const { run, session, ids } = scene();
    const before = session.readTree();
    const history = session.readHistoryStatus();
    run('group pair a2 a1');
    expect(ids('A')).toEqual(['pair']);
    expect(ids('pair')).toEqual(['a1', 'a2']);
    expect(session.readShape('a1')).toMatchObject({ parent: 'g#pair', shape: { attributes: { x: 1, y: 2 } } });
    const grouped = session.readTree();
    expect(session.readHistoryStatus().undoCount).toBe(history.undoCount + 1);
    run('undo'); expect(session.readTree()).toEqual(before);
    run('redo'); expect(session.readTree()).toEqual(grouped);
  });

  it('groups across parents at the lowest common ancestor, before the first involved branch', () => {
    const { run, ids, session } = scene();
    run('group pair b2 a2');
    expect(ids('scene')).toEqual(['pair', 'A', 'B']);
    expect(ids('pair')).toEqual(['a2', 'b2']);
    expect(ids('A')).toEqual(['a1']);
    expect(ids('B')).toEqual(['b1']);
    expect(session.readShape('pair').parent).toBe('g#scene');
  });

  it('supports a document-root LCA and a single selected node', () => {
    const { run, ids } = scene();
    run('create g outside');
    run('group pair outside a1');
    expect(ids()).toEqual(['pair', 'scene']);
    expect(ids('pair')).toEqual(['a1', 'outside']);
    run('group single a2'); expect(ids('single')).toEqual(['a2']);
  });

  it('promotes nested group children into the exact slot and frees only the group ID', () => {
    const { run, ids, session } = scene();
    const before = session.readTree();
    run('ungroup A');
    expect(ids('scene')).toEqual(['a1', 'a2', 'B']);
    expect(session.readShape('a1').parent).toBe('g#scene');
    expect(() => run('show A')).toThrow('no such shape: A');
    run('undo'); expect(session.readTree()).toEqual(before);
    run('redo'); run('create g A');
    run('ungroup b2'); expect(ids('B')).toEqual(['b1']);
  });

  it('addto appends while preserving subtree geometry, descendants, and IDs', () => {
    const { run, session, ids } = scene();
    run('addto B A');
    expect(ids('scene')).toEqual(['B']);
    expect(ids('B')).toEqual(['b1', 'b2', 'A']);
    expect(session.readShape('a2')).toMatchObject({ parent: 'g#A', shape: { attributes: { x: 5, y: 6, text: '甲' } } });
    run('undo'); expect(ids('scene')).toEqual(['A', 'B']);
    run('redo'); expect(ids('B')).toEqual(['b1', 'b2', 'A']);
  });

  it('front/back change only sibling order; same-edge successes still count as one edit', () => {
    const { run, ids, session } = scene();
    run('front a1'); expect(ids('A')).toEqual(['a2', 'a1']);
    expect(ids('scene')).toEqual(['A', 'B']);
    run('back B'); expect(ids('scene')).toEqual(['B', 'A']);
    run('create g outside'); run('back outside'); expect(ids()).toEqual(['outside', 'scene']);
    const count = session.readHistoryStatus().undoCount;
    run('back outside'); expect(session.readHistoryStatus().undoCount).toBe(count + 1);
    run('undo'); run('front outside'); expect(session.readHistoryStatus().redoCount).toBe(0);
  });

  it.each([
    ['group pair A a1', 'cannot group a container into its own descendant: A'],
    ['group pair a1 A', 'cannot group a container into its own descendant: A'],
    ['group pair a1 a1', 'duplicate shape'], ['group A a1', 'id already exists: A'],
    ['group pair a1 missing', 'no such shape: missing'],
    ['ungroup scene', 'cannot ungroup top-level container: scene'],
    ['ungroup a1', 'not a container: a1'], ['ungroup missing', 'no such container: missing'],
    ['addto A A', 'descendant'], ['addto b2 scene', 'descendant'],
    ['addto a1 b1', 'not a container: a1'], ['addto missing a1', 'no such container: missing'],
    ['front missing', 'no such shape: missing'], ['back missing', 'no such shape: missing'],
    ['group pair', 'usage:'], ['ungroup A B', 'usage:'], ['addto A', 'usage:'],
    ['front', 'usage:'], ['back a1 a2', 'usage:'],
  ])('preserves tree and redo on failure: %s', (line, error) => {
    const { run, session } = scene();
    run('move a1 1 0'); run('undo');
    const tree = session.readTree(); const history = session.readHistoryStatus();
    expect(() => run(line)).toThrow(error);
    expect(session.readTree()).toEqual(tree); expect(session.readHistoryStatus()).toEqual(history);
    run('redo'); expect(session.readShape('a1').shape.attributes.x).toBe(2);
  });

  it.each(['group g a', 'ungroup a', 'addto a b', 'front a', 'back a'])('guards the document: %s', line => {
    expect(() => createEditor().run(line)).toThrow("no document. use 'init' or 'read' first");
  });
});
