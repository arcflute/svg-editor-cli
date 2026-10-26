import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';
import type { ShapeStyle } from './ShapeStyle.js';
import type { GeometryDescription } from './ShapeDescription.js';

export class Ellipse extends GeometricShape {
  public constructor(id: string, cx: number, cy: number, rx: number, ry: number, style: ShapeStyle = {}) {
    super(id, new Geometry({ cx }, { cy }, { rx, ry }), style);
  }

  public override get type(): string { return 'ellipse'; }
  public get cx(): number { return this.coordinate('cx'); }
  public get cy(): number { return this.coordinate('cy'); }
  public get rx(): number { return this.coordinate('rx'); }
  public get ry(): number { return this.coordinate('ry'); }
  protected override get geometryDescription(): GeometryDescription {
    return { fields: { cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry } };
  }
  public override clone(): Ellipse { return new Ellipse(this.id, this.cx, this.cy, this.rx, this.ry, this.style); }
}
