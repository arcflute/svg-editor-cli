import { describe, expect, it } from 'vitest';
import { createEditor } from '../helpers/createEditor.js';

describe('delete command', () => {
  it.each(['rect r 1 2 3 4', 'circle r 1 2 3', 'ellipse r 1 2 3 4',
    'line r 1 2 3 4', 'text r 1 2 "文字"', 'g r'])('deletes %s uniformly', definition => {
    const { run, session } = createEditor();
    run('init'); run(`create ${definition}`);
    expect(run('delete r')[0]).toContain('#r deleted');
    expect(session.readTree().nodes).toEqual([]);
    expect(() => run('show r')).toThrow('no such shape: r');
  });

  it('removes a nested subtree, releases every ID, and preserves other siblings in order', () => {
    const { run, session } = createEditor();
    for (const line of ['init', 'create g outer', 'create g first in outer', 'create g target in outer',
      'create g inner in target', 'create rect leaf 1 2 3 4 red in inner',
      'create text label 5 6 "中文" in target', 'create g last in outer']) run(line);
    expect(run('delete target')).toEqual(['g#target deleted']);
    expect(session.readTree('outer').nodes[0]!.children.map(n => n.shape.id)).toEqual(['first', 'last']);
    for (const id of ['target', 'inner', 'leaf', 'label']) {
      expect(() => run(`show ${id}`)).toThrow(`no such shape: ${id}`);
      expect(run(`create g ${id}`)).toEqual([`g#${id} created`]);
    }
    expect(session.readShape('first').parent).toBe('g#outer');
    expect(session.readShape('last').parent).toBe('g#outer');
  });

  it.each(['delete', 'delete r extra', 'delete ""', 'delete missing', 'delete R'])('rejects %s without mutation', line => {
    const { run, session } = createEditor();
    run('init'); run('create g r');
    const before = session.readTree();
    expect(() => run(line)).toThrow();
    expect(session.readTree()).toEqual(before);
  });

  it('does not treat svg as a reserved ordinary shape ID', () => {
    const { run, session } = createEditor();
    run('init');
    expect(() => run('delete svg')).toThrow('no such shape: svg');
    run('create g svg');
    run('delete svg');
    expect(session.readTree()).toEqual({ canvas: { width: 800, height: 600 }, nodes: [] });
  });

  it('guards a missing document and marks delete as available', () => {
    const { run } = createEditor();
    expect(() => run('delete x')).toThrow("no document. use 'init' or 'read' first");
    expect(run('help')).toContain('  delete <id> — delete a subtree');
  });
});
