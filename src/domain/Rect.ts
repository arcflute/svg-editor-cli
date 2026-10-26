import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';
import type { ShapeStyle } from './ShapeStyle.js';
import type { GeometryDescription } from './ShapeDescription.js';

export class Rect extends GeometricShape {
  public constructor(id: string, x: number, y: number, width: number, height: number, style: ShapeStyle = {}) {
    super(id, new Geometry({ x }, { y }, { width, height }), style);
  }

  public override get type(): string { return 'rect'; }
  public get x(): number { return this.coordinate('x'); }
  public get y(): number { return this.coordinate('y'); }
  public get width(): number { return this.coordinate('width'); }
  public get height(): number { return this.coordinate('height'); }
  protected override get geometryDescription(): GeometryDescription {
    return { fields: { x: this.x, y: this.y, w: this.width, h: this.height } };
  }
  public override clone(): Rect { return new Rect(this.id, this.x, this.y, this.width, this.height, this.style); }
}
