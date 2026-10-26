import { Circle } from './Circle.js';
import { DomainError } from './DomainError.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import { Text } from './Text.js';
import { Validation } from './Validation.js';
import type { Shape } from './Shape.js';

/** The only shape-type-name dispatch. Future providers replace this centralized switch. */
export class ShapeFactory {
  public create(type: string, id: string, attributes: Readonly<Record<string, unknown>> = {}): Shape {
    const shape = this.construct(type, id, attributes);
    // Each model validates its own whitelist; no duplicate per-type whitelist here.
    for (const [attribute, value] of Object.entries(attributes)) shape.set(attribute, value);
    return shape;
  }

  private construct(type: string, id: string, attributes: Readonly<Record<string, unknown>>): Shape {
    switch (type) {
      case 'rect':
        return new Rect(id, Validation.finite(attributes.x, 'x'), Validation.finite(attributes.y, 'y'),
          Validation.nonNegative(attributes.width, 'width'), Validation.nonNegative(attributes.height, 'height'));
      case 'circle':
        return new Circle(id, Validation.finite(attributes.cx, 'cx'), Validation.finite(attributes.cy, 'cy'),
          Validation.nonNegative(attributes.r, 'r'));
      case 'ellipse':
        return new Ellipse(id, Validation.finite(attributes.cx, 'cx'), Validation.finite(attributes.cy, 'cy'),
          Validation.nonNegative(attributes.rx, 'rx'), Validation.nonNegative(attributes.ry, 'ry'));
      case 'line':
        return new Line(id, Validation.finite(attributes.x1, 'x1'), Validation.finite(attributes.y1, 'y1'),
          Validation.finite(attributes.x2, 'x2'), Validation.finite(attributes.y2, 'y2'));
      case 'text':
        return new Text(id, Validation.finite(attributes.x, 'x'), Validation.finite(attributes.y, 'y'),
          Validation.text(attributes.text, 'text'));
      case 'g':
        return new Group(id);
      default:
        throw new DomainError('UNKNOWN_SHAPE_TYPE', `unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }
}
