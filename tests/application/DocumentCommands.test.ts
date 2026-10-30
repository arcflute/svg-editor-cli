import { describe, expect, it, vi } from 'vitest';
import { EditorSession } from '../../src/application/EditorSession.js';
import { CommandDispatcher } from '../../src/application/CommandDispatcher.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { XmlSvgCodec } from '../../src/infrastructure/XmlSvgCodec.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

function editor() {
  const files = new Map<string, string>([['/input.svg', '<svg width="300" height="200"><g id="loaded"/></svg>']]);
  const store = {
    resolve: vi.fn((path: string) => path.startsWith('/') ? path : `/${path}`),
    read: vi.fn((path: string) => { if (!files.has(path)) throw new Error('missing'); return files.get(path)!; }),
    writeAtomic: vi.fn((path: string, xml: string) => { files.set(path, xml); }),
  };
  const factory = new ShapeFactory(); const codec = new XmlSvgCodec(factory);
  const session = new EditorSession(factory, store, codec);
  const dispatcher = new CommandDispatcher(session, factory); const tokenizer = new Tokenizer();
  const run = (line: string) => dispatcher.execute(tokenizer.tokenize(line));
  const state = () => ({ tree: session.readTree(), history: session.readHistoryStatus(), path: session.readDefaultPath() });
  return { run, session, store, codec, files, state };
}

describe('document commands and transaction boundaries', () => {
  it('reads without init, uses a resolved default path and updates it after successful explicit save', () => {
    const { run, session, files } = editor();
    expect(run('read input.svg')).toEqual(['read input.svg (1 elements)']);
    expect(session.readDefaultPath()).toBe('/input.svg');
    run('create g new'); run('save'); expect(files.get('/input.svg')).toContain('id="new"');
    run('save "with space.svg"'); expect(session.readDefaultPath()).toBe('/with space.svg');
    run('create g next'); run('save'); expect(files.get('/with space.svg')).toContain('id="next"');
    expect(files.get('/input.svg')).not.toContain('id="next"');
    run('init'); expect(session.readDefaultPath()).toBeNull();
    expect(() => run('save')).toThrow('no default file. use save <file.svg>');
    run('save first.svg'); run('create g later'); run('save');
    expect(files.get('/first.svg')).toContain('id="later"');
  });

  it.each(['read input.svg', 'save output.svg', 'canvas 100 200'])('clears and blocks history on successful %s', line => {
    const { run, session } = editor(); run('init'); run('create g previous'); run('create g undone'); run('undo');
    run(line);
    expect(session.readHistoryStatus()).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    expect(() => run('undo')).toThrow('undo not allowed after io command');
    expect(() => run('redo')).toThrow('undo not allowed after io command');
    expect(() => run('move missing 1 2')).toThrow();
    expect(() => run('undo')).toThrow('undo not allowed after io command');
    const boundary = session.readTree();
    run('create g unlocked'); run('undo'); expect(session.readTree()).toEqual(boundary);
    expect(() => run('undo')).toThrow('nothing to undo');
  });

  it('canvas query preserves both enabled and blocked states; resize preserves geometry and path', () => {
    const { run, session, state } = editor(); run('init');
    for (const mode of ['blocked', 'enabled']) {
      if (mode === 'enabled') { run('create rect r 10 20 30 40'); run('move r 1 2'); run('undo'); }
      const before = state(); expect(run('canvas')).toEqual(['canvas 800x600']); expect(state()).toEqual(before);
    }
    run('save output.svg');
    expect(run('canvas 320.5 240')).toEqual(['canvas resized to 320.5x240']);
    expect(session.readShape('r').shape.attributes).toMatchObject({ x: 10, y: 20, width: 30, height: 40 });
    expect(session.readDefaultPath()).toBe('/output.svg');
  });

  it.each(['canvas 0 1', 'canvas 10', 'canvas 1 NaN', 'canvas 1 2 3', 'read', 'read a b', 'save a b', 'save ""', 'read missing.svg'])('keeps all session state and redo on %s', line => {
    const { run, state } = editor(); run('read input.svg'); run('create g kept'); run('move kept 1 2'); run('undo');
    const before = state(); expect(() => run(line)).toThrow(); expect(state()).toEqual(before); run('redo');
  });

  it('does not commit warnings, IDs, path, document or history for a malformed import', () => {
    const { run, state, files } = editor(); run('init'); run('create g kept'); run('create g undone'); run('undo');
    const before = state();
    files.set('/bad.svg', '<svg><g/><rect id="rect1" x="0" y="0" width="-1" height="1"/></svg>');
    expect(() => run('read bad.svg')).toThrow('non-negative'); expect(state()).toEqual(before);
    files.set('/ok.svg', '<svg><g/></svg>');
    expect(run('read ok.svg')).toEqual(['warning: assigned id g1 to unnamed <g>', 'read ok.svg (1 elements)']);
  });

  it.each(['encode', 'resolve', 'write'])('preserves session and previous file if %s fails', operation => {
    const { run, state, files, codec, store } = editor();
    run('read input.svg'); run('create g new'); run('create g undone'); run('undo');
    const before = state(); const previousFile = files.get('/input.svg');
    if (operation === 'encode') vi.spyOn(codec, 'encode').mockImplementationOnce(() => { throw new Error('encode failed'); });
    if (operation === 'resolve') store.resolve.mockImplementationOnce(() => { throw new Error('resolve failed'); });
    if (operation === 'write') store.writeAtomic.mockImplementationOnce(() => { throw new Error('write failed'); });
    expect(() => run('save another.svg')).toThrow(operation === 'encode' ? 'encode failed' : 'cannot write file: another.svg');
    expect(state()).toEqual(before); expect(files.get('/input.svg')).toBe(previousFile);
    expect(files.has('/another.svg')).toBe(false); run('redo');
  });

  it('retains the associated path across edits and history restores', () => {
    const { run, session } = editor(); run('read input.svg');
    run('create g a'); run('undo'); run('redo'); expect(session.readDefaultPath()).toBe('/input.svg');
  });

  it('isolates the active model from codec references and failures after mutation', () => {
    const { run, codec, state, session } = editor();
    const decoded = codec.decode('<svg><g id="external"/></svg>');
    vi.spyOn(codec, 'decode').mockReturnValueOnce(decoded);
    run('read input.svg');
    decoded.document.require('external').set('fill', 'red');
    expect(session.readShape('external').shape.style).toEqual({});
    run('create g kept'); run('create g undone'); run('undo');
    const before = state();
    vi.spyOn(codec, 'encode').mockImplementationOnce(document => {
      document.remove('external'); throw new Error('serialization failed after mutation');
    });
    expect(() => run('save')).toThrow('serialization failed after mutation');
    expect(state()).toEqual(before);
  });

  it.each(['save', 'save out.svg', 'canvas', 'canvas 1 2'])('guards missing document: %s', line => {
    expect(() => editor().run(line)).toThrow("no document. use 'init' or 'read' first");
  });
});
