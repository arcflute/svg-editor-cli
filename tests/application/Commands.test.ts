import { describe, expect, it, vi } from 'vitest';
import { Command } from '../../src/application/Command.js';
import { CommandDispatcher } from '../../src/application/CommandDispatcher.js';
import { CreateCommand } from '../../src/application/CreateCommand.js';
import { EditorSession } from '../../src/application/EditorSession.js';
import { InitCommand } from '../../src/application/InitCommand.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

function editor() {
  const factory = new ShapeFactory();
  const session = new EditorSession(factory);
  const dispatcher = new CommandDispatcher(session, factory);
  const tokenizer = new Tokenizer();
  return { factory, session, run: (line: string) => dispatcher.execute(tokenizer.tokenize(line)) };
}

const shapes = [
  { type: 'rect', params: '-1 2.5 100 50 #4a90d9', attributes: { x: -1, y: 2.5, width: 100, height: 50, fill: '#4a90d9' } },
  { type: 'circle', params: '10 20 3 red', attributes: { cx: 10, cy: 20, r: 3, fill: 'red' } },
  { type: 'ellipse', params: '10 20 3 4', attributes: { cx: 10, cy: 20, rx: 3, ry: 4 } },
  { type: 'line', params: '1 2 3 4 #ffffff', attributes: { x1: 1, y1: 2, x2: 3, y2: 4, stroke: '#ffffff' } },
  { type: 'text', params: '10 20 "  空格 中文  "', attributes: { x: 10, y: 20, text: '  空格 中文  ' } },
  { type: 'g', params: '', attributes: {} },
];

describe('Command objects and initialization', () => {
  it('holds parsed intent independently from subsequent token or attribute input', () => {
    const { session, factory } = editor();
    const tokens = [{ value: '400', quoted: false }];
    const init = InitCommand.parse(tokens);
    expect(init).toBeInstanceOf(Command);
    tokens[0]!.value = '900';
    expect(init.execute(session)).toEqual(['canvas 400x600 created']);
    const attributes = { x: 1, y: 2, width: 3, height: 4 };
    const create = new CreateCommand('rect', 'r', attributes);
    attributes.x = 99;
    expect(create.execute(session)).toEqual(['rect#r created']);
    expect(session.readShape('r').shape.attributes.x).toBe(1);
    expect(CreateCommand.parse(new Tokenizer().tokenize('g g1'), factory)).toBeInstanceOf(Command);
  });

  it('initializes defaults, A-05 single width, both dimensions, and clears an old document only on success', () => {
    const { run, session } = editor();
    expect(run('init')).toEqual(['canvas 800x600 created']);
    run('create g old');
    expect(run('init 400')).toEqual(['canvas 400x600 created']);
    expect(session.readTree().nodes).toEqual([]);
    expect(run('init 320.5 240')).toEqual(['canvas 320.5x240 created']);
    expect(session.readTree().canvas).toEqual({ width: 320.5, height: 240 });
  });

  it.each(['create rect r 0 0 1 1', 'tree', 'show r', 'create box b', 'tree a b'])('checks the document guard for %s', line => {
    expect(() => editor().run(line)).toThrow("no document. use 'init' or 'read' first");
  });

  it.each(['init -1 10', 'init 100 0', 'init 1 2 3', 'init ""', 'init NaN', 'init 10px', 'init Infinity'])('preserves a previous document on %s', line => {
    const { run, session } = editor();
    run('init 100 200');
    run('create g retained');
    const before = session.readTree();
    expect(() => run(line)).toThrow();
    expect(session.readTree()).toEqual(before);
  });
});

describe('create parsing and candidate commits', () => {
  it.each(shapes)('creates $type at root and under a parent with exact attributes', ({ type, params, attributes }) => {
    const { run, session } = editor();
    run('init');
    run('create g parent');
    expect(run(`create ${type} root ${params}`)).toEqual([`${type}#root created`]);
    expect(run(`create ${type} nested ${params} in parent`)).toEqual([`${type}#nested created in g#parent`]);
    expect(session.readShape('root')).toMatchObject({ parent: 'svg', shape: { attributes } });
    expect(session.readShape('nested')).toMatchObject({ parent: 'g#parent', shape: { attributes } });
    expect(session.readTree().nodes.map(node => node.shape.id)).toEqual(['parent', 'root']);
    expect(session.readTree('parent').nodes[0]!.children.map(node => node.shape.id)).toEqual(['nested']);
  });

  it('distinguishes quoted in from the tail clause, IDs named in, and absent optional paint', () => {
    const { run, session } = editor();
    run('init');
    run('create g node1');
    run('create text t1 10 20 "stay in shape"');
    run('create text t2 10 20 "in" in node1');
    run('create rect r1 0 0 100 50 in node1');
    run('create g node2 in node1');
    run('create g in');
    run('create text empty 0 0 "" in in');
    expect(session.readShape('t1').shape.attributes.text).toBe('stay in shape');
    expect(session.readShape('t2')).toMatchObject({ parent: 'g#node1', shape: { attributes: { text: 'in' } } });
    expect(session.readShape('r1').shape.style).toEqual({});
    expect(session.readShape('empty')).toMatchObject({ parent: 'g#in', shape: { attributes: { text: '' } } });
    expect(session.readTree('node1').nodes[0]!.children.map(node => node.shape.id)).toEqual(['t2', 'r1', 'node2']);
  });

  it.each(['10px', 'NaN', 'Infinity', '-Infinity', '1e309', '0x10', '""', '" 10 "', '--2'])('rejects complete invalid numeric token %s', token => {
    const { run, session } = editor();
    run('init');
    const before = session.readTree();
    expect(() => run(`create rect r ${token} 0 1 1`)).toThrow('x must be a finite number');
    expect(session.readTree()).toEqual(before);
  });

  it('accepts signed decimals, leading/trailing decimal points and finite scientific notation', () => {
    const { run, session } = editor();
    run('init');
    run('create rect r -.5 +2.5e1 3. 0');
    expect(session.readShape('r').shape.attributes).toEqual({ x: -0.5, y: 25, width: 3, height: 0 });
  });

  it.each([
    'create', 'create g', 'create g ""', 'create rect r 0 0 1', 'create circle c 0 0',
    'create ellipse e 0 0 1', 'create line l 0 0 1', 'create text t 0 0', 'create text t 0 0 unquoted',
    'create g g extra', 'create rect r 0 0 1 1 red extra', 'create circle c 0 0 1 red extra',
    'create ellipse e 0 0 1 1 red extra', 'create line l 0 0 1 1 black extra', 'create text t 0 0 "a" extra',
    'create g child in', 'create rect r 0 0 1 1 in', 'create g child in ""',
    'create text t 0 0 "in" parent', 'create g child "in" parent', 'create rect r 0 0 1 1 #ff # trailing',
  ])('rejects arity/quote/clause boundary: %s', line => {
    const { run, session } = editor();
    run('init');
    const before = session.readTree();
    expect(() => run(line)).toThrow();
    expect(session.readTree()).toEqual(before);
  });

  it.each([
    ['create g existing', 'id already exists: existing'],
    ['create g fresh in missing', 'no such container: missing'],
    ['create g fresh in leaf', 'not a container: leaf'],
    ['create box fresh', 'unknown shape type: box (is the plugin loaded?)'],
    ['create HEXAGON fresh', 'unknown shape type: HEXAGON (is the plugin loaded?)'],
    ['create circle fresh 0 0 -1', 'r must be non-negative'],
  ])('keeps session and IDs unchanged after %s', (line, message) => {
    const { run, session } = editor();
    run('init');
    run('create g existing');
    run('create rect leaf 0 0 1 1');
    const before = session.readTree();
    expect(() => run(line)).toThrow(message);
    expect(session.readTree()).toEqual(before);
    expect(run('create g fresh')).toEqual(['g#fresh created']);
  });

  it('uses an independent candidate and commits only after insertion succeeds', () => {
    const { run, session } = editor();
    run('init');
    run('create g original');
    const clones: SvgDocument[] = [];
    const previousDocuments: SvgDocument[] = [];
    const originalClone = SvgDocument.prototype.clone;
    const spy = vi.spyOn(SvgDocument.prototype, 'clone').mockImplementation(function (this: SvgDocument) {
      previousDocuments.push(this);
      const candidate = originalClone.call(this);
      clones.push(candidate);
      return candidate;
    });
    try {
      expect(() => run('create g fail in missing')).toThrow();
      run('create g next');
      expect(previousDocuments[0]).toBe(previousDocuments[1]);
      expect(previousDocuments[0]!.find('next')).toBeUndefined();
      expect(clones[1]!.find('next')).toBeDefined();
      run('create g last');
      expect(previousDocuments[2]).toBe(clones[1]);
      expect(session.readTree().nodes.map(node => node.shape.id)).toEqual(['original', 'next', 'last']);
    } finally { spy.mockRestore(); }
  });
});

describe('queries, help and immutable boundaries', () => {
  it('prints fixed six-type summaries, sibling connectors and subtree boundaries', () => {
    const { run } = editor();
    run('init');
    run('create g outer');
    for (const { type, params } of shapes.slice(0, 5)) run(`create ${type} ${type} ${params} in outer`);
    run('create g sibling');
    const expected = [
      'g#outer',
      '├── rect#rect  x=-1 y=2.5 w=100 h=50 fill=#4a90d9',
      '├── circle#circle  cx=10 cy=20 r=3 fill=red',
      '├── ellipse#ellipse  cx=10 cy=20 rx=3 ry=4',
      '├── line#line  (1,2) -> (3,4) stroke=#ffffff',
      '└── text#text  (10,20) "  空格 中文  "',
    ];
    expect(run('tree outer')).toEqual(expected);
    expect(run('tree')).toEqual([
      'svg (800x600)', '├── g#outer',
      ...expected.slice(1).map(line => `│   ${line}`), '└── g#sibling',
    ]);
    expect(run('tree sibling')).toEqual(['g#sibling']);
    expect(run('tree rect')).toEqual(['rect#rect  x=-1 y=2.5 w=100 h=50 fill=#4a90d9']);
    expect(run('show rect')).toEqual(['rect#rect  parent=g#outer', '  x=-1 y=2.5 width=100 height=50', '  fill=#4a90d9']);
    expect(run('show text')).toEqual(['text#text  parent=g#outer', '  x=10 y=20 text="  空格 中文  "']);
    expect(run('show sibling')).toEqual(['g#sibling  parent=svg']);
  });

  it('returns detached frozen descriptions and queries leave the session unchanged', () => {
    const { run, session } = editor();
    run('init');
    run('create g parent');
    run('create text t 1 2 "in" in parent');
    const before = session.readTree();
    for (const query of ['tree', 'tree parent', 'show t', 'help']) run(query);
    expect(session.readTree()).toEqual(before);
    const description = session.readShape('t');
    expect('move' in description.shape).toBe(false);
    expect(() => Object.assign(description.shape.attributes, { text: 'bad' })).toThrow(TypeError);
    expect(() => Object.assign(description.shape.geometry.points![0]!, { x: 999 })).toThrow(TypeError);
    expect(() => (before.nodes[0]!.children as unknown[]).pop()).toThrow(TypeError);
    run('create g new in parent');
    expect(before.nodes[0]!.children).toHaveLength(1);
    expect(session.readTree().nodes[0]!.children).toHaveLength(2);
  });

  it('supports help without a document and marks all future commands unavailable', () => {
    const { run } = editor();
    const lines = run('help');
    expect(lines).toContain('  create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]');
    expect(lines).toContain('  create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]');
    expect(lines).toContain('  create text <id> <x> <y> "content" [in <containerId>]');
    for (const name of ['read', 'save', 'canvas', 'delete', 'move', 'scale', 'set', 'group', 'ungroup', 'addto', 'front', 'back', 'undo', 'redo']) {
      expect(lines.find(line => line.startsWith(`  ${name} `))).toContain('[not implemented yet]');
      expect(() => run(name)).toThrow(`command not implemented yet: ${name}`);
    }
    for (const name of ['exit', 'quit', 'bogus', 'toString', 'INIT']) expect(() => run(name)).toThrow(`unknown command: ${name}`);
    expect(lines.join('\n')).not.toContain('create box');
  });

  it.each(['show', 'show a b', 'tree a b', 'help extra', 'tree ""', 'show ""'])('enforces query arity: %s', line => {
    const { run, session } = editor();
    run('init');
    const before = session.readTree();
    expect(() => run(line)).toThrow();
    expect(session.readTree()).toEqual(before);
  });

  it('uses exact missing-ID errors and case-sensitive lookup without mutation', () => {
    const { run } = editor();
    run('init');
    run('create g r1');
    run('create g R1');
    expect(run('tree')).toEqual(['svg (800x600)', '├── g#r1', '└── g#R1']);
    expect(() => run('tree absent')).toThrow('no such shape: absent');
    expect(() => run('show absent')).toThrow('no such shape: absent');
  });
});
