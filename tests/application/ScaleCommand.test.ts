import { describe, expect, it } from 'vitest';
import { createEditor } from '../helpers/createEditor.js';

describe('scale command', () => {
  it.each([
    ['rect r -2 4 6 8 red', { x: -1, y: 2, width: 3, height: 4, fill: 'red' }],
    ['circle r -2 4 6', { cx: -1, cy: 2, r: 3 }],
    ['ellipse r -2 4 6 8', { cx: -1, cy: 2, rx: 3, ry: 4 }],
    ['line r -2 4 6 8 black', { x1: -1, y1: 2, x2: 3, y2: 4, stroke: 'black' }],
    ['text r -2 4 "保持文字"', { x: -1, y: 2, text: '保持文字' }],
  ])('scales positions and dimensions of %s together', (definition, attributes) => {
    const { run, session } = createEditor();
    run('init'); run(`create ${definition}`);
    expect(run('scale r .5')[0]).toContain('#r scaled by 0.5');
    expect(session.readShape('r').shape.attributes).toEqual(attributes);
    expect(session.readTree().canvas).toEqual({ width: 800, height: 600 });
  });

  it('scales nested descendants exactly once and accepts empty groups', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g outer', 'create g inner in outer',
      'create rect r 2 4 6 8 in inner', 'create text t 10 20 "文字" in outer', 'create g empty in outer']) run(line);
    expect(run('scale outer 2')).toEqual(['g#outer scaled by 2']);
    expect(session.readShape('r').shape.attributes).toEqual({ x: 4, y: 8, width: 12, height: 16 });
    expect(session.readShape('t').shape.attributes).toEqual({ x: 20, y: 40, text: '文字' });
    expect(run('scale empty 1')).toEqual(['g#empty scaled by 1']);
  });

  it.each(['0', '-1'])('uses the specified error for nonpositive factor %s', factor => {
    const { run, session } = createEditor();
    run('init'); run('create g empty');
    const before = session.readTree();
    expect(() => run(`scale empty ${factor}`)).toThrow(/^scale factor must be positive$/);
    expect(session.readTree()).toEqual(before);
  });

  it.each(['scale', 'scale r', 'scale r 2 extra', 'scale r NaN', 'scale r Infinity',
    'scale r 2px', 'scale r ""', 'scale missing 2'])('rejects %s atomically', line => {
    const { run, session } = createEditor();
    run('init'); run('create circle r 1 2 3');
    const before = session.readTree();
    expect(() => run(line)).toThrow();
    expect(session.readTree()).toEqual(before);
  });

  it('discards a whole-group operation if a late dimension overflows', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g outer', 'create rect first 1 2 3 4 in outer',
      'create g inner in outer', 'create ellipse large 0 0 1 1e308 in inner']) run(line);
    const before = session.readTree();
    expect(() => run('scale outer 2')).toThrow('ry must be a finite number');
    expect(session.readTree()).toEqual(before);
  });

  it('guards a missing document and exposes the implemented syntax', () => {
    const { run } = createEditor();
    expect(() => run('scale r 2')).toThrow("no document. use 'init' or 'read' first");
    expect(run('help')).toContain('  scale <id> <factor> — scale geometry');
  });
});
