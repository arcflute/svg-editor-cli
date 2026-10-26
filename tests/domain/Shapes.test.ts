import { describe, expect, it } from 'vitest';
import { Circle } from '../../src/domain/Circle.js';
import { DomainError } from '../../src/domain/DomainError.js';
import { Ellipse } from '../../src/domain/Ellipse.js';
import { Group } from '../../src/domain/Group.js';
import { Line } from '../../src/domain/Line.js';
import { Rect } from '../../src/domain/Rect.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { Text } from '../../src/domain/Text.js';

const factory = new ShapeFactory();
const cases = [
  { type: 'rect', ctor: Rect, attributes: { x: 1, y: 2, width: 3, height: 4 },
    transformed: { x: 22, y: -6, width: 6, height: 8 }, edits: { x: -1, y: -2, width: 0, height: 5 } },
  { type: 'circle', ctor: Circle, attributes: { cx: 1, cy: 2, r: 3 },
    transformed: { cx: 22, cy: -6, r: 6 }, edits: { cx: -1, cy: -2, r: 0 } },
  { type: 'ellipse', ctor: Ellipse, attributes: { cx: 1, cy: 2, rx: 3, ry: 4 },
    transformed: { cx: 22, cy: -6, rx: 6, ry: 8 }, edits: { cx: -1, cy: -2, rx: 0, ry: 5 } },
  { type: 'line', ctor: Line, attributes: { x1: 1, y1: 2, x2: 3, y2: 4 },
    transformed: { x1: 22, y1: -6, x2: 26, y2: -2 }, edits: { x1: -1, y1: -2, x2: -3, y2: -4 } },
  { type: 'text', ctor: Text, attributes: { x: 1, y: 2, text: '你好 <&> "SVG"' },
    transformed: { x: 22, y: -6, text: '你好 <&> "SVG"' }, edits: { x: -1, y: -2, text: '  新内容<&>  ' } },
  { type: 'g', ctor: Group, attributes: {}, transformed: {}, edits: {} },
];

describe('built-in shapes and factory', () => {
  it.each(cases)('creates $type with its actual class and absent styles', ({ type, ctor, attributes }) => {
    const shape = factory.create(type, 'shape', attributes);
    expect(shape).toBeInstanceOf(ctor);
    expect(shape.id).toBe('shape');
    expect(shape.type).toBe(type);
    expect(shape.attributes).toEqual(attributes);
    expect(shape.style).toEqual({});
    expect(shape.fill).toBeUndefined();
    expect(shape.stroke).toBeUndefined();
    expect(shape.strokeWidth).toBeUndefined();
    expect(shape.parent).toBeNull();
  });

  it.each(cases)('moves and scales $type through the shared Shape API', ({ type, attributes, transformed }) => {
    const shape = factory.create(type, 'shape', attributes);
    shape.move(10, -5);
    shape.scale(2);
    expect(shape.attributes).toEqual(transformed);
  });

  it.each(cases)('sets the own whitelist and common styles of $type', ({ type, attributes, edits }) => {
    const shape = factory.create(type, 'shape', attributes);
    for (const [attribute, value] of Object.entries(edits)) shape.set(attribute, value);
    shape.set('fill', 'none');
    shape.set('stroke', '#aAbBcC');
    shape.set('stroke-width', 0);
    expect(shape.attributes).toEqual({ ...attributes, ...edits, fill: 'none', stroke: '#aAbBcC', 'stroke-width': 0 });
    expect(shape.style).toEqual({ fill: 'none', stroke: '#aAbBcC', 'stroke-width': 0 });
  });

  it('offers typed geometry getters and preserves fractional and negative coordinates', () => {
    const rect = new Rect('r', -1.5, 2.25, 0, 4.5);
    const circle = new Circle('c', 1, 2, 0);
    const ellipse = new Ellipse('e', 1, 2, 3, 4);
    const line = new Line('l', -1, -2, -3, -4);
    const text = new Text('t', 5, 6, '');
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([-1.5, 2.25, 0, 4.5]);
    expect([circle.cx, circle.cy, circle.r]).toEqual([1, 2, 0]);
    expect([ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry]).toEqual([1, 2, 3, 4]);
    expect([line.x1, line.y1, line.x2, line.y2]).toEqual([-1, -2, -3, -4]);
    expect([text.x, text.y, text.text]).toEqual([5, 6, '']);
  });

  it.each(['box', 'path', 'RECT', 'toString'])('rejects unknown type %s', type => {
    expect(() => factory.create(type, 'unknown')).toThrowError(new DomainError(
      'UNKNOWN_SHAPE_TYPE', `unknown shape type: ${type} (is the plugin loaded?)`,
    ));
  });

  it('rejects missing parameters and extra fields without extending a whitelist', () => {
    expect(() => factory.create('rect', 'r', { x: 1, y: 2, width: 3 })).toThrow('height must be a finite number');
    expect(() => factory.create('g', 'g', { x: 1 })).toThrow('unknown attribute: x');
    expect(() => factory.create('circle', 'c', { cx: 1, cy: 2, r: 3, width: 10 })).toThrow('unknown attribute: width');
  });

  it('rejects non-whitelisted attributes and ID edits for every type without mutation', () => {
    for (const { type, attributes } of cases) {
      const shape = factory.create(type, 'original', attributes);
      for (const attribute of ['id', 'transform', 'font-size', 'label', '__proto__']) {
        expect(() => shape.set(attribute, 'new')).toThrow(`unknown attribute: ${attribute}`);
        expect(shape.id).toBe('original');
        expect(shape.attributes).toEqual(attributes);
      }
    }
  });

  it.each(['', ' \t\n'])('rejects a blank ID %j', id => {
    expect(() => new Group(id)).toThrow('id must not be empty');
  });

  it('preserves text exactly, including whitespace, XML characters, and newlines', () => {
    const content = '  中文 <tag> & "quotes"\n下一行  ';
    const text = new Text('t', 0, 0, content);
    expect(text.text).toBe(content);
    text.set('text', '');
    expect(text.text).toBe('');
    expect(() => text.set('text', 42)).toThrow('text must be a string');
    expect(text.text).toBe('');
  });

  it('does not share mutable input styles or expose mutable attributes', () => {
    const style = { fill: 'red', 'stroke-width': 2 };
    const rect = new Rect('r', 1, 2, 3, 4, style);
    style.fill = 'blue';
    expect(rect.fill).toBe('red');
    expect(() => Object.assign(rect.style, { fill: 'green' })).toThrow(TypeError);
    expect(() => Object.assign(rect.attributes, { x: 999 })).toThrow(TypeError);
    expect(() => Object.assign(rect, { id: 'new' })).toThrow(TypeError);
    expect(rect.x).toBe(1);
    rect.scale(2);
    expect(rect.strokeWidth).toBe(2);
  });
});

describe('numeric validation and failure atomicity', () => {
  it.each([NaN, Infinity, -Infinity, '2', null])('rejects invalid numeric input %s without mutation', value => {
    const rect = new Rect('r', 1, 2, 3, 4);
    const before = rect.attributes;
    expect(() => rect.set('x', value)).toThrow(DomainError);
    expect(() => rect.move(1, value as number)).toThrow(DomainError);
    expect(() => new Circle('c', 1, 2, value as number)).toThrow(DomainError);
    expect(rect.attributes).toEqual(before);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('rejects scale factor %s without mutation', factor => {
    const line = new Line('l', 1, 2, 3, 4);
    expect(() => line.scale(factor)).toThrow('scale factor must be positive');
    expect(line.attributes).toEqual({ x1: 1, y1: 2, x2: 3, y2: 4 });
    expect(() => new Group('g').scale(factor)).toThrow(DomainError);
  });

  it('rejects negative dimensions and invalid styles at construction and set', () => {
    expect(() => new Rect('r', 0, 0, -1, 1)).toThrow(DomainError);
    expect(() => new Circle('c', 0, 0, -1)).toThrow(DomainError);
    expect(() => new Ellipse('e', 0, 0, 1, -1)).toThrow(DomainError);
    const rect = new Rect('r', 1, 2, 3, 4, { fill: 'red' });
    for (const [attribute, value] of [['width', -1], ['height', -1], ['stroke-width', -1], ['fill', ''], ['stroke', 5]] as const) {
      expect(() => rect.set(attribute, value)).toThrow(DomainError);
    }
    expect(rect.attributes).toEqual({ x: 1, y: 2, width: 3, height: 4, fill: 'red' });
  });

  it('rejects arithmetic overflow before committing any coordinate', () => {
    const rect = new Rect('r', 1, Number.MAX_VALUE, 3, 4);
    const before = rect.attributes;
    expect(() => rect.move(2, Number.MAX_VALUE)).toThrow(DomainError);
    expect(rect.attributes).toEqual(before);
    expect(() => rect.scale(2)).toThrow(DomainError);
    expect(rect.attributes).toEqual(before);
  });

  it('does not partially transform earlier siblings when a later descendant overflows', () => {
    const first = new Rect('first', 1, 2, 3, 4);
    const last = new Circle('last', 0, Number.MAX_VALUE, 1);
    const inner = new Group('inner', [last]);
    const outer = new Group('outer', [first, inner]);
    expect(() => outer.move(5, Number.MAX_VALUE)).toThrow(DomainError);
    expect(first.attributes).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(last.attributes).toEqual({ cx: 0, cy: Number.MAX_VALUE, r: 1 });
    expect(() => outer.scale(2)).toThrow(DomainError);
    expect(first.attributes).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(last.cy).toBe(Number.MAX_VALUE);
    expect(last.parent).toBe(inner);
    expect(inner.parent).toBe(outer);
  });

  it('rejects dimension overflow even when all resulting coordinates are finite', () => {
    const ellipse = new Ellipse('e', 1, 2, 3, Number.MAX_VALUE);
    expect(() => ellipse.scale(2)).toThrow('ry must be a finite number');
    expect(ellipse.attributes).toEqual({ cx: 1, cy: 2, rx: 3, ry: Number.MAX_VALUE });
  });

  it('preserves both line endpoints when only the second endpoint overflows', () => {
    const line = new Line('l', 1, 2, Number.MAX_VALUE, 4);
    expect(() => line.move(Number.MAX_VALUE, 5)).toThrow('x2 must be a finite number');
    expect(line.attributes).toEqual({ x1: 1, y1: 2, x2: Number.MAX_VALUE, y2: 4 });
  });
});

describe('Composite geometry and style', () => {
  it('transforms each descendant exactly once across three container levels', () => {
    const rect = new Rect('r', 1, 2, 3, 4, { fill: 'red' });
    const text = new Text('t', 5, 6, '原样<&>');
    const line = new Line('l', 1, 2, 3, 4);
    const root = new Group('root', [rect, new Group('nested', [new Group('deep', [text]), line])]);
    root.move(10, -5);
    root.scale(0.5);
    expect(rect.attributes).toEqual({ x: 5.5, y: -1.5, width: 1.5, height: 2, fill: 'red' });
    expect(text.attributes).toEqual({ x: 7.5, y: 0.5, text: '原样<&>' });
    expect(line.attributes).toEqual({ x1: 5.5, y1: -1.5, x2: 6.5, y2: -0.5 });
    expect(root.children.map(child => child.id)).toEqual(['r', 'nested']);
  });

  it('keeps group styles on the container and preserves child explicit and absent styles', () => {
    const rect = new Rect('r', 0, 0, 1, 1, { fill: 'red' });
    const text = new Text('t', 0, 0, 'text');
    const group = new Group('g', [rect, text]);
    group.set('fill', 'blue');
    group.set('stroke', 'black');
    group.set('stroke-width', 2);
    expect(group.style).toEqual({ fill: 'blue', stroke: 'black', 'stroke-width': 2 });
    expect(rect.style).toEqual({ fill: 'red' });
    expect(text.style).toEqual({});
    expect(() => group.set('x', 10)).toThrow('unknown attribute: x');
  });
});
