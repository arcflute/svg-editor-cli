import { DomainError } from './DomainError.js';
import { TreeNode } from './TreeNode.js';
import { Validation } from './Validation.js';
import type { Group } from './Group.js';
import type { ShapeStyle } from './ShapeStyle.js';
import type { SvgDocument } from './SvgDocument.js';
import type { GeometryDescription, ShapeDescription } from './ShapeDescription.js';

export abstract class Shape extends TreeNode {
  readonly #id: string;
  #style: ShapeStyle = {};

  protected constructor(id: string, style: ShapeStyle = {}) {
    super();
    this.#id = Validation.nonBlank(id, 'id');
    for (const [attribute, value] of Object.entries(style)) {
      if (!this.setStyle(attribute, value)) throw new DomainError('UNKNOWN_ATTRIBUTE', `unknown attribute: ${attribute}`);
    }
  }

  public abstract get type(): string;
  public get id(): string { return this.#id; }
  public get parent(): Group | SvgDocument | null { return this.parentNode as Group | SvgDocument | null; }
  public get children(): readonly Shape[] { return this.childNodes as readonly Shape[]; }
  public get style(): ShapeStyle { return Object.freeze({ ...this.#style }); }
  public get fill(): string | undefined { return this.#style.fill; }
  public get stroke(): string | undefined { return this.#style.stroke; }
  public get strokeWidth(): number | undefined { return this.#style['stroke-width']; }
  public get attributes(): Readonly<Record<string, string | number>> {
    return Object.freeze({ ...this.#style, ...this.ownAttributes });
  }
  protected override get nodeId(): string { return this.#id; }
  protected get ownAttributes(): Readonly<Record<string, string | number>> { return {}; }
  protected get geometryDescription(): GeometryDescription { return {}; }

  public describe(): ShapeDescription {
    const geometry = this.geometryDescription;
    return Object.freeze({
      id: this.id, type: this.type, attributes: this.attributes, style: Object.freeze({ ...this.#style }),
      geometry: Object.freeze({
        ...geometry,
        fields: Object.freeze({ ...geometry.fields }),
        points: Object.freeze((geometry.points ?? []).map(point => Object.freeze({ ...point }))),
      }),
    });
  }

  public move(dx: number, dy: number): void {
    Validation.finite(dx, 'dx');
    Validation.finite(dy, 'dy');
    this.planMove(dx, dy)();
  }

  public scale(factor: number): void {
    Validation.scaleFactor(factor);
    this.planScale(factor)();
  }

  public set(attribute: string, value: unknown): void {
    if (!this.setStyle(attribute, value)) this.setOwnAttribute(attribute, value);
  }

  /** Neutral value kind for input adapters; geometry/text names come from the model itself. */
  public attributeKind(attribute: string): 'number' | 'text' {
    if (attribute === 'fill' || attribute === 'stroke') return 'text';
    if (attribute === 'stroke-width') return 'number';
    const own = this.ownAttributes;
    if (!Object.hasOwn(own, attribute)) throw new DomainError('UNKNOWN_ATTRIBUTE', `unknown attribute: ${attribute}`);
    return typeof own[attribute] === 'number' ? 'number' : 'text';
  }

  public abstract clone(): Shape;
  protected abstract planMove(dx: number, dy: number): () => void;
  protected abstract planScale(factor: number): () => void;

  protected setOwnAttribute(attribute: string, _value: unknown): void {
    throw new DomainError('UNKNOWN_ATTRIBUTE', `unknown attribute: ${attribute}`);
  }

  protected planChildrenMove(dx: number, dy: number): () => void {
    const commits = this.children.map(child => child.planMove(dx, dy));
    return () => { for (const commit of commits) commit(); };
  }

  protected planChildrenScale(factor: number): () => void {
    const commits = this.children.map(child => child.planScale(factor));
    return () => { for (const commit of commits) commit(); };
  }

  private setStyle(attribute: string, value: unknown): boolean {
    switch (attribute) {
      case 'fill':
      case 'stroke':
        this.#style = { ...this.#style, [attribute]: Validation.nonBlank(value, attribute) };
        return true;
      case 'stroke-width':
        this.#style = { ...this.#style, 'stroke-width': Validation.nonNegative(value, attribute) };
        return true;
      default:
        return false;
    }
  }
}
