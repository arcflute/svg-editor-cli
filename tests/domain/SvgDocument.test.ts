import { describe, expect, it } from 'vitest';
import { Circle } from '../../src/domain/Circle.js';
import { DomainError } from '../../src/domain/DomainError.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import type { Shape } from '../../src/domain/Shape.js';

describe('document root and controlled structure operations', () => {
  it('has an ID-less root, positive canvas dimensions, and atomic resize', () => {
    const doc = new SvgDocument();
    expect([doc.width, doc.height, doc.roots]).toEqual([800, 600, []]);
    expect('id' in doc).toBe(false);
    expect('move' in doc).toBe(false);
    expect(() => doc.resize(100, 0)).toThrow(DomainError);
    expect([doc.width, doc.height]).toEqual([800, 600]);
    expect(() => new SvgDocument(NaN, 1)).toThrow(DomainError);
    expect(() => new SvgDocument(1, Infinity)).toThrow(DomainError);
    doc.resize(320.5, 240.25);
    expect([doc.width, doc.height]).toEqual([320.5, 240.25]);
    const namedSvg = new Group('svg');
    doc.insert(namedSvg);
    expect(doc.find('svg')).toBe(namedSvg);
    expect(namedSvg.parent).toBe(doc);
  });

  it('inserts roots and subtrees at stable positions and indexes every descendant', () => {
    const doc = new SvgDocument();
    const a = new Rect('a', 0, 0, 1, 1);
    const b = new Circle('b', 1, 2, 3);
    const inner = new Group('inner', [b]);
    const group = new Group('g', [inner]);
    doc.insert(a);
    doc.insert(group, undefined, 0);
    const c = new Rect('c', 0, 0, 1, 1);
    doc.insert(c, 'g', 0);
    expect(doc.roots).toEqual([group, a]);
    expect(group.children).toEqual([c, inner]);
    expect(inner.children).toEqual([b]);
    expect([a.parent, group.parent, c.parent, inner.parent, b.parent]).toEqual([doc, doc, group, group, inner]);
    for (const shape of [a, b, c, inner, group]) expect(doc.find(shape.id)).toBe(shape);
    expect(doc.find('missing')).toBeUndefined();
    expect(() => doc.require('missing')).toThrow('no such shape: missing');
  });

  it('treats IDs as case-sensitive and scopes uniqueness to one document', () => {
    const doc = new SvgDocument();
    const lower = new Group('r1');
    const upper = new Group('R1');
    doc.insert(lower);
    doc.insert(upper);
    expect(doc.find('r1')).toBe(lower);
    expect(doc.find('R1')).toBe(upper);
    expect(() => doc.insert(new Group('r1'), 'R1')).toThrow('id already exists: r1');
    expect(doc.roots).toEqual([lower, upper]);
    expect(upper.children).toEqual([]);
    const second = new SvgDocument();
    const independent = new Group('r1');
    second.insert(independent);
    expect(second.require('r1')).toBe(independent);
    expect(doc.require('r1')).toBe(lower);
  });

  it('rejects internal duplicate IDs before attaching any part of a subtree', () => {
    const first = new Rect('duplicate', 0, 0, 1, 1);
    const second = new Circle('duplicate', 0, 0, 1);
    const inner = new Group('inner', [second]);
    const subtree = new Group('g', [first, inner]);
    const doc = new SvgDocument();
    expect(() => doc.insert(subtree)).toThrow('id already exists: duplicate');
    expect(doc.roots).toEqual([]);
    for (const id of ['g', 'inner', 'duplicate']) expect(doc.find(id)).toBeUndefined();
    expect(subtree.parent).toBeNull();
    expect(first.parent).toBe(subtree);
    expect(second.parent).toBe(inner);
  });

  it('rejects conflicts between a subtree and the existing document without partial indexing', () => {
    const existing = new Group('taken');
    const doc = new SvgDocument(800, 600, [existing]);
    const unique = new Group('unique');
    const subtree = new Group('candidate', [new Group('taken'), unique]);
    expect(() => doc.insert(subtree, 'taken')).toThrow('id already exists: taken');
    expect(doc.roots).toEqual([existing]);
    expect(existing.children).toEqual([]);
    expect(doc.find('candidate')).toBeUndefined();
    expect(doc.find('unique')).toBeUndefined();
    expect(doc.find('taken')).toBe(existing);
    expect(subtree.parent).toBeNull();
    expect(unique.parent).toBe(subtree);
  });

  it('validates all initial roots before a document constructor takes ownership', () => {
    const first = new Group('duplicate');
    const second = new Group('duplicate');
    expect(() => new SvgDocument(800, 600, [first, second])).toThrow(DomainError);
    expect(first.parent).toBeNull();
    expect(second.parent).toBeNull();
    const doc = new SvgDocument(800, 600, [first]);
    expect(doc.require('duplicate')).toBe(first);
  });

  it('rejects repeated instances in a detached group without partially assigning parents', () => {
    const shape = new Group('child');
    expect(() => new Group('bad', [shape, shape])).toThrow(DomainError);
    expect(shape.parent).toBeNull();
    const existingParent = new Group('parent', [shape]);
    const fresh = new Group('fresh');
    expect(() => new Group('bad', [fresh, shape])).toThrow(DomainError);
    expect(fresh.parent).toBeNull();
    expect(shape.parent).toBe(existingParent);
    expect(existingParent.children).toEqual([shape]);
  });

  it('rejects repeated mounting and sharing a mutable subtree across documents', () => {
    const leaf = new Group('leaf');
    const group = new Group('g', [leaf]);
    const first = new SvgDocument(800, 600, [group]);
    const second = new SvgDocument();
    expect(() => first.insert(group)).toThrow(DomainError);
    expect(() => first.insert(leaf)).toThrow(DomainError);
    expect(() => second.insert(group)).toThrow(DomainError);
    expect(() => second.insert(leaf)).toThrow(DomainError);
    expect(() => new Group('wrapper', [group])).toThrow(DomainError);
    expect(first.roots).toEqual([group]);
    expect(group.children).toEqual([leaf]);
    expect(second.roots).toEqual([]);
    expect(second.find('leaf')).toBeUndefined();
  });

  it('deletes a whole subtree, releases its IDs, and permits explicit detached transfer', () => {
    const leaf = new Rect('r', 1, 2, 3, 4);
    const inner = new Group('inner', [leaf]);
    const group = new Group('g', [inner]);
    const survivor = new Group('survivor');
    const first = new SvgDocument(800, 600, [group, survivor]);
    expect(first.remove('g')).toBe(group);
    expect(first.roots).toEqual([survivor]);
    for (const id of ['g', 'inner', 'r']) expect(first.find(id)).toBeUndefined();
    expect(group.parent).toBeNull();
    expect(inner.parent).toBe(group);
    expect(leaf.parent).toBe(inner);
    const replacement = new Group('g', [new Group('inner'), new Group('r')]);
    first.insert(replacement);
    expect(first.require('r')).not.toBe(leaf);
    const second = new SvgDocument();
    second.insert(group);
    expect(second.require('r')).toBe(leaf);
    expect(group.parent).toBe(second);
  });

  it('removes a nested leaf and keeps surrounding siblings and parent intact', () => {
    const a = new Group('a');
    const b = new Group('b');
    const c = new Group('c');
    const parent = new Group('p', [a, b, c]);
    const doc = new SvgDocument(800, 600, [parent]);
    expect(doc.remove('b')).toBe(b);
    expect(parent.children).toEqual([a, c]);
    expect(b.parent).toBeNull();
    expect(doc.find('b')).toBeUndefined();
    expect(() => doc.remove('b')).toThrow(DomainError);
    expect(parent.children).toEqual([a, c]);
  });

  it('reparents a subtree and restores exact positions without changing indexed instances', () => {
    const leaf = new Rect('r', 1, 2, 3, 4);
    const moved = new Group('moved', [leaf]);
    const left = new Group('left', [moved]);
    const a = new Group('a');
    const b = new Group('b');
    const right = new Group('right', [a, b]);
    const doc = new SvgDocument(800, 600, [left, right]);
    doc.reparent('moved', 'right', 1);
    expect(left.children).toEqual([]);
    expect(right.children).toEqual([a, moved, b]);
    expect(moved.parent).toBe(right);
    expect(leaf.parent).toBe(moved);
    expect(doc.require('r')).toBe(leaf);
    expect(doc.require('moved')).toBe(moved);
    doc.reparent('moved', undefined, 0);
    expect(doc.roots).toEqual([moved, left, right]);
    expect(right.children).toEqual([a, b]);
    doc.reparent('moved', 'left', 0);
    expect(doc.roots).toEqual([left, right]);
    expect(left.children).toEqual([moved]);
    expect(leaf.attributes).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it('uses final destination indices for same-parent reordering and defaults to append', () => {
    const a = new Group('a');
    const b = new Group('b');
    const c = new Group('c');
    const doc = new SvgDocument(800, 600, [a, b, c]);
    doc.reparent('a', undefined, 2);
    expect(doc.roots).toEqual([b, c, a]);
    doc.reparent('a', undefined, 0);
    expect(doc.roots).toEqual([a, b, c]);
    doc.reparent('b');
    expect(doc.roots).toEqual([a, c, b]);
    doc.reparent('b', undefined, 2);
    expect(doc.roots).toEqual([a, c, b]);
  });

  it('rejects self-containment and ancestor-descendant cycles without losing the index', () => {
    const deep = new Group('deep');
    const inner = new Group('inner', [deep]);
    const outer = new Group('outer', [inner]);
    const doc = new SvgDocument(800, 600, [outer]);
    for (const parentId of ['outer', 'inner', 'deep']) {
      expect(() => doc.reparent('outer', parentId)).toThrow('cannot move a container into itself or its descendant');
      expect(doc.roots).toEqual([outer]);
      expect(outer.children).toEqual([inner]);
      expect(inner.children).toEqual([deep]);
      expect(outer.parent).toBe(doc);
      expect(inner.parent).toBe(outer);
      expect(deep.parent).toBe(inner);
      for (const node of [outer, inner, deep]) expect(doc.require(node.id)).toBe(node);
    }
  });

  it.each([-1, 0.5, NaN, Infinity, 3])('rejects invalid position %s before detach or insert', position => {
    const a = new Group('a');
    const b = new Group('b');
    const fresh = new Group('fresh');
    const doc = new SvgDocument(800, 600, [a, b]);
    expect(() => doc.reparent('a', undefined, position)).toThrow(DomainError);
    expect(() => doc.insert(fresh, undefined, position)).toThrow(DomainError);
    expect(doc.roots).toEqual([a, b]);
    expect(a.parent).toBe(doc);
    expect(fresh.parent).toBeNull();
    expect(doc.find('fresh')).toBeUndefined();
  });

  it('rejects missing and leaf destinations, preserving all existing structure', () => {
    const leaf = new Rect('leaf', 1, 2, 3, 4);
    const group = new Group('g');
    const doc = new SvgDocument(800, 600, [leaf, group]);
    const fresh = new Group('fresh');
    for (const target of ['missing', 'leaf']) {
      expect(() => doc.reparent('g', target)).toThrow(DomainError);
      expect(() => doc.insert(fresh, target)).toThrow(DomainError);
      expect(doc.roots).toEqual([leaf, group]);
      expect(group.parent).toBe(doc);
      expect(fresh.parent).toBeNull();
      expect(doc.find('fresh')).toBeUndefined();
    }
  });

  it('copies input collections and exposes frozen snapshots with no index mutation API', () => {
    const child = new Group('child');
    const input: Shape[] = [child];
    const group = new Group('g', input);
    input.length = 0;
    const roots: Shape[] = [group];
    const doc = new SvgDocument(800, 600, roots);
    roots.length = 0;
    const oldRoots = doc.roots;
    expect(() => (doc.roots as Shape[]).push(new Group('bad'))).toThrow(TypeError);
    expect(() => (group.children as Shape[]).splice(0, 1)).toThrow(TypeError);
    expect(() => Object.assign(child, { parent: null })).toThrow(TypeError);
    expect('index' in doc).toBe(false);
    doc.insert(new Group('next'));
    expect(oldRoots).toEqual([group]);
    expect(doc.roots.map(shape => shape.id)).toEqual(['g', 'next']);
    expect(group.children).toEqual([child]);
    expect(child.parent).toBe(group);
    expect(doc.require('child')).toBe(child);
  });

  it('never mounts a document root as a shape', () => {
    const first = new SvgDocument();
    const second = new SvgDocument();
    expect(() => first.insert(second as unknown as Shape)).toThrow(DomainError);
    expect(first.roots).toEqual([]);
    expect(second.roots).toEqual([]);
  });
});
