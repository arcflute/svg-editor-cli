import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';
import type { ShapeStyle } from './ShapeStyle.js';

export class Circle extends GeometricShape {
  public constructor(id: string, cx: number, cy: number, r: number, style: ShapeStyle = {}) {
    super(id, new Geometry({ cx }, { cy }, { r }), style);
  }

  public override get type(): string { return 'circle'; }
  public get cx(): number { return this.coordinate('cx'); }
  public get cy(): number { return this.coordinate('cy'); }
  public get r(): number { return this.coordinate('r'); }
  public override clone(): Circle { return new Circle(this.id, this.cx, this.cy, this.r, this.style); }
}
