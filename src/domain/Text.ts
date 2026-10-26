import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';
import { Validation } from './Validation.js';
import type { ShapeStyle } from './ShapeStyle.js';

export class Text extends GeometricShape {
  #text: string;

  public constructor(id: string, x: number, y: number, text: string, style: ShapeStyle = {}) {
    super(id, new Geometry({ x }, { y }, {}), style);
    this.#text = Validation.text(text, 'text');
  }

  public override get type(): string { return 'text'; }
  public get x(): number { return this.coordinate('x'); }
  public get y(): number { return this.coordinate('y'); }
  public get text(): string { return this.#text; }
  public override clone(): Text { return new Text(this.id, this.x, this.y, this.text, this.style); }
  protected override get ownAttributes(): Readonly<Record<string, string | number>> {
    return { ...super.ownAttributes, text: this.#text };
  }
  protected override setOwnAttribute(attribute: string, value: unknown): void {
    if (attribute === 'text') this.#text = Validation.text(value, 'text');
    else super.setOwnAttribute(attribute, value);
  }
}
