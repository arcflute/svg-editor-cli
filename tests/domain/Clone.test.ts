import { describe, expect, it } from 'vitest';
import { Circle } from '../../src/domain/Circle.js';
import { Ellipse } from '../../src/domain/Ellipse.js';
import { Group } from '../../src/domain/Group.js';
import { Line } from '../../src/domain/Line.js';
import { Rect } from '../../src/domain/Rect.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { Text } from '../../src/domain/Text.js';

function example(): SvgDocument {
  const nested = new Group('nested', [
    new Circle('c', 10, 20, 5, { fill: 'none' }),
    new Ellipse('e', 30, 40, 5, 6),
    new Text('t', 7, 8, '  中文<&>\n"原文"  ', { 'stroke-width': 0 }),
  ], { stroke: 'blue' });
  return new SvgDocument(400, 300, [
    new Group('g', [new Rect('r', 1, 2, 3, 4), nested], { fill: 'red' }),
    new Line('l', 1, 2, 3, 4, { stroke: 'none' }),
  ]);
}

describe('polymorphic deep cloning', () => {
  it('preserves real types, dimensions, ordered trees, exact attributes and a new index', () => {
    const original = example();
    const clone = original.clone();
    expect(clone).toBeInstanceOf(SvgDocument);
    expect(clone).not.toBe(original);
    expect([clone.width, clone.height]).toEqual([400, 300]);
    const types = [
      ['g', Group], ['r', Rect], ['nested', Group], ['c', Circle],
      ['e', Ellipse], ['t', Text], ['l', Line],
    ] as const;
    for (const [id, ctor] of types) {
      const copy = clone.require(id);
      const source = original.require(id);
      expect(copy).toBeInstanceOf(ctor);
      expect(copy).not.toBe(source);
      expect(copy.attributes).toEqual(source.attributes);
      expect(copy.style).toEqual(source.style);
      expect(copy.children.map(child => child.id)).toEqual(source.children.map(child => child.id));
      for (const child of copy.children) {
        expect(child.parent).toBe(copy);
        expect(clone.require(child.id)).toBe(child);
      }
    }
    expect(clone.roots.map(shape => shape.id)).toEqual(['g', 'l']);
    expect(clone.require('g').children.map(shape => shape.id)).toEqual(['r', 'nested']);
    expect(clone.require('nested').children.map(shape => shape.id)).toEqual(['c', 'e', 't']);
    expect(clone.require('g').parent).toBe(clone);
    expect(clone.require('l').parent).toBe(clone);
    expect(clone.require('r').style).toEqual({});
    expect(clone.require('c').style).toEqual({ fill: 'none' });
    expect(clone.require('t').style).toEqual({ 'stroke-width': 0 });
  });

  it('isolates edits, collections, parent links, dimensions and index changes in both directions', () => {
    const original = example();
    const clone = original.clone();
    clone.require('g').move(10, 20);
    clone.require('t').set('text', 'changed');
    clone.require('r').set('fill', 'green');
    clone.reparent('c', undefined, 0);
    clone.remove('e');
    clone.insert(new Group('copy-only'));
    clone.resize(50, 60);
    expect(original.require('r').attributes).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect((original.require('t') as Text).text).toBe('  中文<&>\n"原文"  ');
    expect(original.require('c').parent).toBe(original.require('nested'));
    expect(original.require('e')).toBeInstanceOf(Ellipse);
    expect(original.find('copy-only')).toBeUndefined();
    expect([original.width, original.height]).toEqual([400, 300]);
    expect(clone.require('r').attributes).toEqual({ x: 11, y: 22, width: 3, height: 4, fill: 'green' });
    expect(clone.require('c').parent).toBe(clone);

    original.require('l').scale(3);
    original.require('g').set('stroke', 'black');
    original.remove('r');
    original.insert(new Group('source-only'));
    expect(clone.require('l').attributes).toEqual({ x1: 1, y1: 2, x2: 3, y2: 4, stroke: 'none' });
    expect(clone.require('g').style).toEqual({ fill: 'red' });
    expect(clone.require('r')).toBeInstanceOf(Rect);
    expect(clone.find('source-only')).toBeUndefined();
  });

  it('clones an attached subtree as a detached independent tree ready for another document', () => {
    const original = example();
    const subtree = original.require('g').clone();
    expect(subtree.parent).toBeNull();
    const second = new SvgDocument(800, 600, [subtree]);
    expect(second.require('nested').parent).toBe(subtree);
    second.require('nested').scale(2);
    expect((second.require('c') as Circle).r).toBe(10);
    expect((original.require('c') as Circle).r).toBe(5);
    expect(original.require('g').parent).toBe(original);
  });

  it('clones an empty document and empty group without introducing IDs or styles', () => {
    const doc = new SvgDocument(1, 2);
    expect(doc.clone().roots).toEqual([]);
    const group = new Group('empty').clone();
    expect(group).toBeInstanceOf(Group);
    expect(group.children).toEqual([]);
    expect(group.style).toEqual({});
    expect(group.parent).toBeNull();
  });
});
