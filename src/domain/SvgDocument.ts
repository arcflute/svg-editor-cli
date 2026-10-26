import { DomainError } from './DomainError.js';
import { TreeNode } from './TreeNode.js';
import { Validation } from './Validation.js';
import type { Shape } from './Shape.js';

export class SvgDocument extends TreeNode {
  #width: number;
  #height: number;

  public constructor(width = 800, height = 600, roots: readonly Shape[] = []) {
    super();
    this.#width = Validation.positive(width, 'canvas width');
    this.#height = Validation.positive(height, 'canvas height');
    this.initializeRoot(roots);
  }

  public get width(): number { return this.#width; }
  public get height(): number { return this.#height; }
  public get roots(): readonly Shape[] { return this.childNodes as readonly Shape[]; }
  protected override get nodeId(): undefined { return undefined; }
  protected override get acceptsChildren(): boolean { return true; }

  public resize(width: number, height: number): void {
    Validation.positive(width, 'canvas width');
    Validation.positive(height, 'canvas height');
    this.#width = width;
    this.#height = height;
  }

  public find(id: string): Shape | undefined { return this.findNode(id) as Shape | undefined; }

  public require(id: string): Shape {
    const shape = this.find(id);
    if (shape === undefined) throw new DomainError('NO_SUCH_SHAPE', `no such shape: ${id}`);
    return shape;
  }

  public insert(shape: Shape, parentId?: string, position?: number): void {
    this.insertNode(shape, this.destination(parentId), position);
  }

  public remove(id: string): Shape {
    const shape = this.require(id);
    this.removeNode(shape);
    return shape;
  }

  public reparent(id: string, parentId?: string, position?: number): void {
    this.reparentNode(this.require(id), this.destination(parentId), position);
  }

  public clone(): SvgDocument {
    return new SvgDocument(this.width, this.height, this.roots.map(root => root.clone()));
  }

  private destination(parentId?: string): TreeNode {
    if (parentId === undefined) return this;
    const parent = this.find(parentId);
    if (parent === undefined) throw new DomainError('NO_SUCH_CONTAINER', `no such container: ${parentId}`);
    return parent;
  }
}
