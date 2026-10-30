import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { InputError } from './InputError.js';
import { HistoryEntry } from './HistoryEntry.js';
import { HistoryManager } from './HistoryManager.js';
import type { Shape } from '../domain/Shape.js';
import type { ShowView, TreeNodeView, TreeView } from './DocumentView.js';
import type { EditCommand } from './EditCommand.js';
import type { HistoryStatus } from './HistoryStatus.js';

export class EditorSession {
  #state: Readonly<{ document: SvgDocument | null; history: HistoryManager }> = Object.freeze({
    document: null, history: HistoryManager.afterDocumentOperation(),
  });

  public constructor(private readonly factory: ShapeFactory) {}

  public ensureDocument(): void { this.requireDocument(); }

  public initialize(width: number, height: number): Readonly<{ width: number; height: number }> {
    const candidate = new SvgDocument(width, height);
    const result = Object.freeze({ width: candidate.width, height: candidate.height });
    this.#state = Object.freeze({ document: candidate, history: HistoryManager.afterDocumentOperation() });
    return result;
  }

  public executeEdit(command: EditCommand): readonly string[] {
    const before = this.requireDocument();
    const candidate = before.clone();
    const result = Object.freeze([...command.apply(candidate, this.factory)]);
    const entry = new HistoryEntry(command, before, candidate, result);
    const history = this.#state.history.record(entry);
    this.#state = Object.freeze({ document: candidate, history });
    return result;
  }

  public readHistoryStatus(): HistoryStatus { return this.#state.history.status(); }

  public undo(): readonly string[] {
    this.requireDocument();
    const next = this.#state.history.undo();
    this.#state = Object.freeze({ document: next.document, history: next.history });
    return next.output;
  }

  public redo(): readonly string[] {
    this.requireDocument();
    const next = this.#state.history.redo();
    this.#state = Object.freeze({ document: next.document, history: next.history });
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
}
