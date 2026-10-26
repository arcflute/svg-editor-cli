import { Circle } from './Circle.js';
import { DomainError } from './DomainError.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import { Text } from './Text.js';
import { Validation } from './Validation.js';
import type { Shape } from './Shape.js';
import type { ShapeParameter, ShapeTypeDescription } from './ShapeTypeDescription.js';

interface ShapeDefinition {
  readonly description: ShapeTypeDescription;
  readonly construct: (id: string, attributes: Readonly<Record<string, unknown>>) => Shape;
}

/** One static definition per type supplies both construction and neutral parameter metadata. */
export class ShapeFactory {
  readonly #definitions: ReadonlyMap<string, ShapeDefinition>;

  public constructor() {
    this.#definitions = new Map([
      this.define('rect', [
        { name: 'x', attribute: 'x', kind: 'number' }, { name: 'y', attribute: 'y', kind: 'number' },
        { name: 'w', attribute: 'width', kind: 'number' }, { name: 'h', attribute: 'height', kind: 'number' },
        { name: 'fill', attribute: 'fill', kind: 'paint', optional: true },
      ], (id, a) => new Rect(id, Validation.finite(a.x, 'x'), Validation.finite(a.y, 'y'),
        Validation.nonNegative(a.width, 'width'), Validation.nonNegative(a.height, 'height'))),
      this.define('circle', [
        { name: 'cx', attribute: 'cx', kind: 'number' }, { name: 'cy', attribute: 'cy', kind: 'number' },
        { name: 'r', attribute: 'r', kind: 'number' }, { name: 'fill', attribute: 'fill', kind: 'paint', optional: true },
      ], (id, a) => new Circle(id, Validation.finite(a.cx, 'cx'), Validation.finite(a.cy, 'cy'), Validation.nonNegative(a.r, 'r'))),
      this.define('ellipse', [
        { name: 'cx', attribute: 'cx', kind: 'number' }, { name: 'cy', attribute: 'cy', kind: 'number' },
        { name: 'rx', attribute: 'rx', kind: 'number' }, { name: 'ry', attribute: 'ry', kind: 'number' },
        { name: 'fill', attribute: 'fill', kind: 'paint', optional: true },
      ], (id, a) => new Ellipse(id, Validation.finite(a.cx, 'cx'), Validation.finite(a.cy, 'cy'),
        Validation.nonNegative(a.rx, 'rx'), Validation.nonNegative(a.ry, 'ry'))),
      this.define('line', [
        { name: 'x1', attribute: 'x1', kind: 'number' }, { name: 'y1', attribute: 'y1', kind: 'number' },
        { name: 'x2', attribute: 'x2', kind: 'number' }, { name: 'y2', attribute: 'y2', kind: 'number' },
        { name: 'stroke', attribute: 'stroke', kind: 'paint', optional: true },
      ], (id, a) => new Line(id, Validation.finite(a.x1, 'x1'), Validation.finite(a.y1, 'y1'),
        Validation.finite(a.x2, 'x2'), Validation.finite(a.y2, 'y2'))),
      this.define('text', [
        { name: 'x', attribute: 'x', kind: 'number' }, { name: 'y', attribute: 'y', kind: 'number' },
        { name: 'content', attribute: 'text', kind: 'text' },
      ], (id, a) => new Text(id, Validation.finite(a.x, 'x'), Validation.finite(a.y, 'y'), Validation.text(a.text, 'text'))),
      this.define('g', [], id => new Group(id)),
    ]);
  }

  public create(type: string, id: string, attributes: Readonly<Record<string, unknown>> = {}): Shape {
    const shape = this.definition(type).construct(id, attributes);
    // Each model validates its own whitelist; no duplicate per-type whitelist here.
    for (const [attribute, value] of Object.entries(attributes)) shape.set(attribute, value);
    return shape;
  }

  public describe(type: string): ShapeTypeDescription { return this.definition(type).description; }

  public descriptions(): readonly ShapeTypeDescription[] {
    return Object.freeze([...this.#definitions.values()].map(definition => definition.description));
  }

  private definition(type: string): ShapeDefinition {
    const definition = this.#definitions.get(type);
    if (definition === undefined) {
      throw new DomainError('UNKNOWN_SHAPE_TYPE', `unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return definition;
  }

  private define(type: string, parameters: readonly ShapeParameter[], construct: ShapeDefinition['construct']): [string, ShapeDefinition] {
    const description = Object.freeze({ type, parameters: Object.freeze(parameters.map(parameter => Object.freeze({ ...parameter }))) });
    return [type, Object.freeze({ description, construct })];
  }
}
