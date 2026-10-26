import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { InputError } from './InputError.js';
import type { Shape } from '../domain/Shape.js';
import type { ShowView, TreeNodeView, TreeView } from './DocumentView.js';

export class EditorSession {
  #document: SvgDocument | null = null;

  public constructor(private readonly factory: ShapeFactory) {}

  public ensureDocument(): void { this.requireDocument(); }

  public initialize(width: number, height: number): Readonly<{ width: number; height: number }> {
    const candidate = new SvgDocument(width, height);
    const result = Object.freeze({ width: candidate.width, height: candidate.height });
    this.#document = candidate;
    return result;
  }

  public create(type: string, id: string, attributes: Readonly<Record<string, string | number>>, parentId?: string): Readonly<{ type: string; id: string; parent: string | null }> {
    const candidate = this.requireDocument().clone();
    const shape = this.factory.create(type, id, attributes);
    candidate.insert(shape, parentId);
    const result = Object.freeze({ type: shape.type, id: shape.id, parent: parentId ?? null });
    this.#document = candidate;
    return result;
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
    if (this.#document === null) throw new InputError("no document. use 'init' or 'read' first");
    return this.#document;
  }
}
