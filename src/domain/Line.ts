import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';
import type { ShapeStyle } from './ShapeStyle.js';
import type { GeometryDescription } from './ShapeDescription.js';

export class Line extends GeometricShape {
  public constructor(id: string, x1: number, y1: number, x2: number, y2: number, style: ShapeStyle = {}) {
    super(id, new Geometry({ x1, x2 }, { y1, y2 }, {}), style);
  }

  public override get type(): string { return 'line'; }
  public get x1(): number { return this.coordinate('x1'); }
  public get y1(): number { return this.coordinate('y1'); }
  public get x2(): number { return this.coordinate('x2'); }
  public get y2(): number { return this.coordinate('y2'); }
  protected override get geometryDescription(): GeometryDescription {
    return { points: [{ x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 }] };
  }
  public override clone(): Line { return new Line(this.id, this.x1, this.y1, this.x2, this.y2, this.style); }
}
