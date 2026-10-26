import { expect, it } from 'vitest';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { Text } from '../../src/domain/Text.js';

it('exposes neutral frozen factory metadata with the correct aliases and optional paint', () => {
  const factory = new ShapeFactory();
  expect(factory.descriptions().map(description => description.type)).toEqual(['rect', 'circle', 'ellipse', 'line', 'text', 'g']);
  expect(factory.describe('rect').parameters).toEqual([
    { name: 'x', attribute: 'x', kind: 'number' }, { name: 'y', attribute: 'y', kind: 'number' },
    { name: 'w', attribute: 'width', kind: 'number' }, { name: 'h', attribute: 'height', kind: 'number' },
    { name: 'fill', attribute: 'fill', kind: 'paint', optional: true },
  ]);
  expect(factory.describe('line').parameters.at(-1)).toEqual({ name: 'stroke', attribute: 'stroke', kind: 'paint', optional: true });
  expect(factory.describe('text').parameters.at(-1)).toEqual({ name: 'content', attribute: 'text', kind: 'text' });
  expect(factory.describe('g').parameters).toEqual([]);
  expect(() => Object.assign(factory.describe('rect').parameters[2]!, { attribute: 'wrong' })).toThrow(TypeError);
  expect(() => (factory.descriptions() as unknown[]).pop()).toThrow(TypeError);
  expect(() => factory.describe('box')).toThrow('unknown shape type: box (is the plugin loaded?)');
});

it('keeps presentation values detached, including controls in raw model text', () => {
  const text = new Text('t', 1, 2, 'a\nb<&>', { fill: 'red' });
  const description = text.describe();
  text.move(5, 6);
  text.set('text', 'changed');
  expect(description.geometry).toEqual({ fields: {}, points: [{ x: 1, y: 2 }], text: 'a\nb<&>' });
  expect(description.attributes).toEqual({ x: 1, y: 2, text: 'a\nb<&>', fill: 'red' });
  expect(() => Object.assign(description.geometry.points![0]!, { x: 5 })).toThrow(TypeError);
});
