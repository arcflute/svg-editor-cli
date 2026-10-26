import { Geometry } from './Geometry.js';
import { Shape } from './Shape.js';
import type { ShapeStyle } from './ShapeStyle.js';

export abstract class GeometricShape extends Shape {
  #geometry: Geometry;

  protected constructor(id: string, geometry: Geometry, style: ShapeStyle = {}) {
    super(id, style);
    this.#geometry = geometry;
  }

  protected coordinate(name: string): number { return this.#geometry.value(name); }
  protected override get ownAttributes(): Readonly<Record<string, string | number>> { return this.#geometry.values; }

  protected override setOwnAttribute(attribute: string, value: unknown): void {
    this.#geometry = this.#geometry.withAttribute(attribute, value);
  }

  protected override planMove(dx: number, dy: number): () => void {
    const geometry = this.#geometry.moved(dx, dy);
    return () => { this.#geometry = geometry; };
  }

  protected override planScale(factor: number): () => void {
    const geometry = this.#geometry.scaled(factor);
    return () => { this.#geometry = geometry; };
  }
}
