import { Shape } from './Shape.js';
import type { ShapeStyle } from './ShapeStyle.js';

export class Group extends Shape {
  public constructor(id: string, children: readonly Shape[] = [], style: ShapeStyle = {}) {
    super(id, style);
    this.initializeChildren(children);
  }

  public override get type(): string { return 'g'; }
  protected override get acceptsChildren(): boolean { return true; }
  protected override planMove(dx: number, dy: number): () => void { return this.planChildrenMove(dx, dy); }
  protected override planScale(factor: number): () => void { return this.planChildrenScale(factor); }
  public override clone(): Group { return new Group(this.id, this.children.map(child => child.clone()), this.style); }
}
