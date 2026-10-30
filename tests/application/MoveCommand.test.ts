import { describe, expect, it } from 'vitest';
import { createEditor } from '../helpers/createEditor.js';

describe('move command', () => {
  it.each([
    ['rect r 1 2 3 4', { x: -1, y: 2.5, width: 3, height: 4 }],
    ['circle r 1 2 3', { cx: -1, cy: 2.5, r: 3 }],
    ['ellipse r 1 2 3 4', { cx: -1, cy: 2.5, rx: 3, ry: 4 }],
    ['line r 1 2 3 4', { x1: -1, y1: 2.5, x2: 1, y2: 4.5 }],
    ['text r 1 2 "中文"', { x: -1, y: 2.5, text: '中文' }],
  ])('moves %s by an increment without changing size or style', (definition, attributes) => {
    const { run, session } = createEditor();
    run('init'); run(`create ${definition}`);
    expect(run('move r -2 .5')[0]).toContain('#r moved by (-2,0.5)');
    expect(session.readShape('r').shape.attributes).toEqual(attributes);
    expect(session.readShape('r').shape.style).toEqual({});
  });

  it('moves only node2 descendants, once each, leaving the sibling and connecting line in place', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g flowchart', 'create g node1 in flowchart',
      'create rect first 10 20 30 40 in node1', 'create g node2 in flowchart',
      'create g nested in node2', 'create rect second 100 200 30 40 in nested',
      'create text label 110 220 "第二节点" in node2', 'create line arrow 40 40 100 220 in flowchart']) run(line);
    const first = session.readShape('first');
    const arrow = session.readShape('arrow');
    expect(run('move node2 0 100')).toEqual(['g#node2 moved by (0,100)']);
    expect(session.readShape('second').shape.attributes).toEqual({ x: 100, y: 300, width: 30, height: 40 });
    expect(session.readShape('label').shape.attributes).toEqual({ x: 110, y: 320, text: '第二节点' });
    expect(session.readShape('first')).toEqual(first);
    expect(session.readShape('arrow')).toEqual(arrow);
    expect(session.readTree('node2').nodes[0]!.children.map(n => n.shape.id)).toEqual(['nested', 'label']);
  });

  it.each(['move', 'move r 1', 'move r 1 2 extra', 'move r 10px 1', 'move r 1 Infinity',
    'move r "" 1', 'move absent 1 2'])('rejects %s without changing the tree', line => {
    const { run, session } = createEditor();
    run('init'); run('create rect r 1 2 3 4');
    const before = session.readTree();
    expect(() => run(line)).toThrow();
    expect(session.readTree()).toEqual(before);
  });

  it('discards the entire candidate when a later nested leaf overflows', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g g1', 'create rect first 0 0 1 1 in g1',
      'create g inner in g1', 'create line huge 0 0 1e308 0 in inner']) run(line);
    const before = session.readTree();
    expect(() => run('move g1 1e308 0')).toThrow('x2 must be a finite number');
    expect(session.readTree()).toEqual(before);
    expect(run('move first 1 1')).toEqual(['rect#first moved by (1,1)']);
  });

  it('guards a missing document and lists move as available in help', () => {
    const { run } = createEditor();
    expect(() => run('move x 1 2')).toThrow("no document. use 'init' or 'read' first");
    expect(run('help')).toContain('  move <id> <dx> <dy> — translate a shape');
  });
});
