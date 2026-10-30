import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { InputError } from './InputError.js';
import { HistoryEntry } from './HistoryEntry.js';
import { HistoryManager } from './HistoryManager.js';
import type { Shape } from '../domain/Shape.js';
import type { ShowView, TreeNodeView, TreeView } from './DocumentView.js';
import type { EditCommand } from './EditCommand.js';
import type { HistoryStatus } from './HistoryStatus.js';
import type { DocumentStore } from './DocumentStore.js';
import type { SvgCodec } from './SvgCodec.js';

export class EditorSession {
  #state: Readonly<{ document: SvgDocument | null; history: HistoryManager; path: string | null }> = Object.freeze({
    document: null, history: HistoryManager.afterDocumentOperation(), path: null,
  });

  public constructor(private readonly factory: ShapeFactory, private readonly store?: DocumentStore, private readonly codec?: SvgCodec) {}

  public ensureDocument(): void { this.requireDocument(); }

  public initialize(width: number, height: number): Readonly<{ width: number; height: number }> {
    const candidate = new SvgDocument(width, height);
    const result = Object.freeze({ width: candidate.width, height: candidate.height });
    this.#state = Object.freeze({ document: candidate, history: HistoryManager.afterDocumentOperation(), path: null });
    return result;
  }

  public executeEdit(command: EditCommand): readonly string[] {
    const before = this.requireDocument();
    const candidate = before.clone();
    const result = Object.freeze([...command.apply(candidate, this.factory)]);
    const entry = new HistoryEntry(command, before, candidate, result);
    const history = this.#state.history.record(entry);
    this.#state = Object.freeze({ ...this.#state, document: candidate, history });
    return result;
  }

  public readHistoryStatus(): HistoryStatus { return this.#state.history.status(); }
  public readDefaultPath(): string | null { return this.#state.path; }

  public read(path: string): readonly string[] {
    const { store, codec } = this.io();
    let location: string;
    let xml: string;
    try { location = store.resolve(path); xml = store.read(location); }
    catch { throw new InputError(`cannot read file: ${path}`); }
    const decoded = codec.decode(xml);
    const candidate = decoded.document.clone();
    const output = Object.freeze([...decoded.warnings, `read ${path} (${candidate.elementCount} elements)`]);
    const next = Object.freeze({ document: candidate, path: location, history: HistoryManager.afterDocumentOperation() });
    this.#state = next;
    return output;
  }

  public save(path?: string): readonly string[] {
    const document = this.requireDocument();
    const requested = path ?? this.#state.path;
    if (requested === null) throw new InputError('no default file. use save <file.svg>');
    const { store, codec } = this.io();
    const xml = codec.encode(document.clone());
    let location: string;
    try { location = store.resolve(requested); }
    catch { throw new InputError(`cannot write file: ${requested}`); }
    const output = Object.freeze([`saved to ${requested} (${document.elementCount} elements)`]);
    const next = Object.freeze({ document, path: location, history: HistoryManager.afterDocumentOperation() });
    try { store.writeAtomic(location, xml); }
    catch { throw new InputError(`cannot write file: ${requested}`); }
    this.#state = next;
    return output;
  }

  public canvas(width?: number, height?: number): readonly string[] {
    const document = this.requireDocument();
    if (width === undefined && height === undefined) return Object.freeze([`canvas ${document.width}x${document.height}`]);
    if (width === undefined || height === undefined) throw new InputError('canvas requires both width and height');
    const candidate = document.clone();
    candidate.resize(width, height);
    const output = Object.freeze([`canvas resized to ${candidate.width}x${candidate.height}`]);
    this.#state = Object.freeze({ ...this.#state, document: candidate, history: HistoryManager.afterDocumentOperation() });
    return output;
  }

  public undo(): readonly string[] {
    this.requireDocument();
    const next = this.#state.history.undo();
    this.#state = Object.freeze({ ...this.#state, document: next.document, history: next.history });
    return next.output;
  }

  public redo(): readonly string[] {
    this.requireDocument();
    const next = this.#state.history.redo();
    this.#state = Object.freeze({ ...this.#state, document: next.document, history: next.history });
    return next.output;
  }

  public readTree(id?: string): TreeView {
    const document = this.requireDocument();
    return Object.freeze({
      canvas: id === undefined ? Object.freeze({ width: document.width, height: document.height }) : null,
      nodes: Object.freeze((id === undefined ? document.roots : [document.require(id)]).map(shape => this.describeTree(shape))),
    });
  }

  public readShape(id: string): ShowView {
    const document = this.requireDocument();
    const shape = document.require(id);
    const parent = shape.parent;
    return Object.freeze({ shape: shape.describe(), parent: parent !== null && 'id' in parent ? `${parent.type}#${parent.id}` : 'svg' });
  }

  private describeTree(shape: Shape): TreeNodeView {
    return Object.freeze({ shape: shape.describe(), children: Object.freeze(shape.children.map(child => this.describeTree(child))) });
  }

  private requireDocument(): SvgDocument {
    if (this.#state.document === null) throw new InputError("no document. use 'init' or 'read' first");
    return this.#state.document;
  }

  private io(): Readonly<{ store: DocumentStore; codec: SvgCodec }> {
    if (this.store === undefined || this.codec === undefined) throw new InputError('document storage is not configured');
    return { store: this.store, codec: this.codec };
  }
}
