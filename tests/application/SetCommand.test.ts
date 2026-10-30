import { describe, expect, it } from 'vitest';
import { SetCommand } from '../../src/application/SetCommand.js';
import { createEditor } from '../helpers/createEditor.js';

describe('set command', () => {
  it.each([
    ['rect r 1 2 3 4', 'x', '-2.5', -2.5], ['rect r 1 2 3 4', 'y', '1e1', 10],
    ['rect r 1 2 3 4', 'width', '0', 0], ['rect r 1 2 3 4', 'height', '.5', 0.5],
    ['circle r 1 2 3', 'cx', '-2', -2], ['circle r 1 2 3', 'cy', '0', 0], ['circle r 1 2 3', 'r', '4', 4],
    ['ellipse r 1 2 3 4', 'cx', '0', 0], ['ellipse r 1 2 3 4', 'cy', '-3', -3],
    ['ellipse r 1 2 3 4', 'rx', '0', 0], ['ellipse r 1 2 3 4', 'ry', '5', 5],
    ['line r 1 2 3 4', 'x1', '-3', -3], ['line r 1 2 3 4', 'y1', '0', 0],
    ['line r 1 2 3 4', 'x2', '10', 10], ['line r 1 2 3 4', 'y2', '20', 20],
    ['text r 1 2 "old"', 'x', '0', 0], ['text r 1 2 "old"', 'y', '-4', -4],
  ] as const)('converts %s %s to a number', (definition, attribute, input, expected) => {
    const { run, session } = createEditor();
    run('init'); run(`create ${definition}`);
    run(`set r ${attribute} ${input}`);
    expect(session.readShape('r').shape.attributes[attribute]).toBe(expected);
    expect(session.readShape('r').shape.style).toEqual({});
  });

  it.each(['rect r 0 0 1 1', 'circle r 0 0 1', 'ellipse r 0 0 1 1',
    'line r 0 0 1 1', 'text r 0 0 "x"', 'g r'])('supports explicit common styles on %s', definition => {
    const { run, session } = createEditor();
    run('init'); run(`create ${definition}`);
    expect(session.readShape('r').shape.style).toEqual({});
    run('set r fill #ffffff'); run('set r stroke none'); run('set r stroke-width 0');
    expect(session.readShape('r').shape.style).toEqual({ fill: '#ffffff', stroke: 'none', 'stroke-width': 0 });
  });

  it('changes container style without overwriting explicit or missing child styles', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g g1', 'create rect r 0 0 1 1 red in g1',
      'create text t 0 0 "原文" in g1']) run(line);
    run('set g1 fill blue');
    expect(session.readShape('g1').shape.style).toEqual({ fill: 'blue' });
    expect(session.readShape('r').shape.style).toEqual({ fill: 'red' });
    expect(session.readShape('t').shape.style).toEqual({});
    run('set g1 stroke-width 3'); run('scale g1 2');
    expect(session.readShape('g1').shape.style['stroke-width']).toBe(3);
  });

  it('preserves empty text, whitespace, XML characters, quotes and backslashes without XML escaping', () => {
    const { run, session } = createEditor();
    run('init'); run('create text t 1 2 "old"');
    const content = String.raw`  中文 <&> "引号" C:\tmp  `;
    const token = { value: content, quoted: true };
    const command = new SetCommand('t', 'text', token);
    token.value = 'changed outside';
    expect(command.execute(session)).toEqual([`text#t updated: text=${JSON.stringify(content)}`]);
    expect(session.readShape('t').shape.attributes.text).toBe(content);
    expect(run('set t text ""')).toEqual(['text#t updated: text=""']);
    expect(run('set t text in')).toEqual(['text#t updated: text="in"']);
    expect(session.readShape('t').shape.attributes.text).toBe('in');
  });

  it.each(['id', 'transform', 'font-size', 'r', 'label', 'w', 'toString', '__proto__'])('rejects non-whitelisted rect field %s', attribute => {
    const { run, session } = createEditor();
    run('init'); run('create rect r 0 0 1 1');
    const before = session.readTree();
    expect(() => run(`set r ${attribute} 1`)).toThrow(`unknown attribute: ${attribute}`);
    expect(session.readTree()).toEqual(before);
  });

  it.each(['set', 'set r x', 'set r x 1 extra', 'set r width -1', 'set r x 10px',
    'set r x Infinity', 'set r x NaN', 'set r x 1e309', 'set r x ""', 'set r stroke-width -1',
    'set r fill ""', 'set missing x 1'])('rejects %s without changing the document', line => {
    const { run, session } = createEditor();
    run('init'); run('create rect r 1 2 3 4');
    const before = session.readTree();
    expect(() => run(line)).toThrow();
    expect(session.readTree()).toEqual(before);
  });

  it('rejects group geometry and checks no-document and help contracts', () => {
    const { run } = createEditor();
    expect(() => run('set r fill red')).toThrow("no document. use 'init' or 'read' first");
    expect(run('help')).toContain('  set <id> <attr> <value> — set an attribute');
    run('init'); run('create g g1');
    expect(() => run('set g1 x 1')).toThrow('unknown attribute: x');
  });
});
