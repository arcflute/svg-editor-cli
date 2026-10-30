import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { XmlSvgCodec } from '../../src/infrastructure/XmlSvgCodec.js';

const directories: string[] = [];
const codec = new XmlSvgCodec(new ShapeFactory());
const example = (name: string) => fileURLToPath(new URL(`../../examples/${name}`, import.meta.url));
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
function replay(input: string) {
  const directory = mkdtempSync(join(tmpdir(), 'svg-acceptance-')); directories.push(directory);
  copyFileSync(example('other.svg'), join(directory, 'other.svg'));
  const result = spawnSync(process.execPath, ['--import', new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
    fileURLToPath(new URL('../../src/bootstrap/main.ts', import.meta.url))], { cwd: directory, input, encoding: 'utf8', timeout: 10_000 });
  expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
  return { ...result, directory };
}

describe('assignment acceptance', () => {
  it('replays §6, preserves the pre-save state and imports all seven external elements', () => {
    const result = replay(readFileSync(example('transcript.commands.txt'), 'utf8'));
    expect(result.stderr.trim().split(/\r?\n/)).toEqual([
      'error: cannot group a container into its own descendant: markers', 'error: undo not allowed after io command',
    ]);
    expect(result.stdout).toContain('saved to demo.svg (5 elements)');
    expect(result.stdout).toContain('warning: assigned id rect1 to unnamed <rect>');
    expect(result.stdout).toContain('read other.svg (7 elements)');
    expect(result.stdout).toContain('svg (400x300)');
    expect(result.stdout).toContain('ellipse#e1  cx=1 cy=2 rx=3 ry=4');
    const saved = codec.decode(readFileSync(join(result.directory, 'demo.svg'), 'utf8')).document;
    expect(saved.elementCount).toBe(5);
    expect(saved.require('markers').children.map(shape => shape.id)).toEqual(['c1', 'box']);
    expect(saved.require('c1').attributes.cx).toBe(130);
    expect(saved.require('title').attributes.text).toBe('My Diagram');
    expect(saved.require('box').type).toBe('rect');
    expect(saved.find('bad')).toBeUndefined();
  });

  it('replays §6.1 version A and saves eight objects, with restored node2 and updated content', () => {
    const result = replay(readFileSync(example('flowchart.commands.txt'), 'utf8'));
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('rect#process  x=520 y=200 w=160 h=60 fill=#f5a623');
    expect(result.stdout).toContain('text#process-label  (545,235) "处理数据"');
    const saved = codec.decode(readFileSync(join(result.directory, 'flowchart.svg'), 'utf8')).document;
    expect(saved.elementCount).toBe(8);
    expect(saved.require('flowchart').children.map(shape => shape.id)).toEqual(['node1', 'node2', 'arrow1']);
    expect(saved.require('start').attributes).toMatchObject({ x: 120, y: 100 });
    expect(saved.require('process').attributes).toMatchObject({ x: 520, y: 100 });
    expect(saved.require('process-label').attributes).toMatchObject({ x: 545, y: 135, text: '处理数据 v2' });
    expect(saved.require('arrow1').attributes).toEqual({ x1: 280, y1: 130, x2: 520, y2: 130, stroke: 'black' });
  });

  it('emits the mandatory errors once per line, with no false successful outputs', () => {
    const result = replay(['move r 1 2', 'init', 'create g scene', 'create rect r1 0 0 1 1 in scene',
      'create rect r1 0 0 1 1', 'delete r9', 'create g child in node9', 'addto r1 scene',
      'group bad r1 scene', 'ungroup scene', 'scale r1 0', 'set r1 invalid 1', 'create box b',
      'read missing.svg', 'save "missing/out.svg"', 'init', 'undo', 'redo', 'help'].join('\n'));
    expect(result.stderr.trim().split(/\r?\n/)).toEqual([
      "error: no document. use 'init' or 'read' first", 'error: id already exists: r1',
      'error: no such shape: r9', 'error: no such container: node9', 'error: not a container: r1',
      'error: cannot group a container into its own descendant: scene', 'error: cannot ungroup top-level container: scene',
      'error: scale factor must be positive', 'error: unknown attribute: invalid',
      'error: unknown shape type: box (is the plugin loaded?)', 'error: cannot read file: missing.svg',
      'error: cannot write file: missing/out.svg', 'error: undo not allowed after io command', 'error: undo not allowed after io command',
    ]);
    expect(result.stdout).not.toContain('not implemented yet');
    expect(result.stdout).not.toContain('g#bad grouped');
    expect(result.stdout).not.toContain('saved to');
    for (const name of ['init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set',
      'group', 'ungroup', 'addto', 'front', 'back', 'tree', 'show', 'help', 'undo', 'redo']) {
      expect(result.stdout).toMatch(new RegExp(`  ${name}(?: | —)`));
    }
  });
});
