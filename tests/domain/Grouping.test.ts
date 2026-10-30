import { expect, it } from 'vitest';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';

it('domain grouping failure leaves original instances, parents, order, index and detached target intact', () => {
  const a = new Rect('a', 1, 2, 3, 4);
  const inner = new Group('inner', [a]);
  const root = new Group('root', [inner]);
  const doc = new SvgDocument(800, 600, [root]);
  const target = new Group('new');
  for (const ids of [['inner', 'a'], ['a', 'missing'], ['a', 'a'], []]) {
    expect(() => doc.group(target, ids)).toThrow();
    expect(doc.roots).toEqual([root]); expect(root.children).toEqual([inner]);
    expect(inner.children).toEqual([a]); expect(a.parent).toBe(inner);
    expect(doc.find('a')).toBe(a); expect(doc.find('new')).toBeUndefined();
    expect(target.parent).toBeNull(); expect(target.children).toEqual([]);
  }
  expect(() => doc.group(new Rect('leaf', 0, 0, 1, 1), ['a'])).toThrow('empty detached container');
  expect(() => doc.group(new Group('inner'), ['a'])).toThrow('id already exists');
  expect(() => doc.group(new Group('full', [new Group('child')]), ['a'])).toThrow();
  doc.group(target, ['a']);
  expect(doc.find('a')).toBe(a); expect(a.parent).toBe(target);
  doc.ungroup('new');
  expect(a.parent).toBe(inner); expect(doc.find('new')).toBeUndefined();
  expect(target.parent).toBeNull(); expect(target.children).toEqual([]);
  doc.insert(target); expect(doc.find('new')).toBe(target);
});

it('domain ungroup and reorder reject invalid operations without changing indexes or ownership', () => {
  const a = new Group('a'); const b = new Group('b');
  const doc = new SvgDocument(1, 1, [a, b]);
  expect(() => doc.ungroup('a')).toThrow('cannot ungroup top-level container: a');
  expect(() => doc.group(a, ['b'])).toThrow('already attached');
  expect(doc.roots).toEqual([a, b]); expect(doc.find('a')).toBe(a);
  doc.reorder('a', 'front'); expect(doc.roots).toEqual([b, a]);
  doc.reorder('a', 'back'); expect(doc.roots).toEqual([a, b]);
});
