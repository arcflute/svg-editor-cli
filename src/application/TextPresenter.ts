import type { ShapeDescription } from '../domain/ShapeDescription.js';
import type { ShowView, TreeNodeView, TreeView } from './DocumentView.js';

/** Formats presentation values, never dispatches on shape types or modifies a model. */
export class TextPresenter {
  public tree(view: TreeView): readonly string[] {
    const lines: string[] = [];
    if (view.canvas !== null) {
      lines.push(`svg (${view.canvas.width}x${view.canvas.height})`);
      this.children(view.nodes, '', lines);
    } else {
      for (const node of view.nodes) {
        lines.push(this.summary(node.shape));
        this.children(node.children, '', lines);
      }
    }
    return Object.freeze(lines);
  }

  public show(view: ShowView): readonly string[] {
    const shape = view.shape;
    const lines = [`${shape.type}#${shape.id}  parent=${view.parent}`];
    const geometry = Object.fromEntries(Object.entries(shape.attributes).filter(([key]) => !Object.hasOwn(shape.style, key)));
    for (const fields of [geometry, shape.style]) {
      const text = this.fields(fields);
      if (text.length > 0) lines.push(`  ${text}`);
    }
    return Object.freeze(lines);
  }

  private children(nodes: readonly TreeNodeView[], prefix: string, lines: string[]): void {
    nodes.forEach((node, index) => {
      const last = index === nodes.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${this.summary(node.shape)}`);
      this.children(node.children, `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }

  private summary(shape: ShapeDescription): string {
    const geometry = shape.geometry;
    const pieces = [this.fields(geometry.fields ?? {})];
    if (geometry.points !== undefined && geometry.points.length > 0) {
      pieces.push(geometry.points.map(point => `(${point.x},${point.y})`).join(' -> '));
    }
    if (geometry.text !== undefined) pieces.push(JSON.stringify(geometry.text));
    pieces.push(this.fields(shape.style));
    const detail = pieces.filter(piece => piece.length > 0).join(' ');
    return `${shape.type}#${shape.id}${detail.length > 0 ? `  ${detail}` : ''}`;
  }

  private fields(fields: Readonly<Record<string, string | number>>): string {
    return Object.entries(fields).map(([key, value]) => {
      const rendered = typeof value === 'string' && (key === 'text' || /[\s"\\]/u.test(value)) ? JSON.stringify(value) : String(value);
      return `${key}=${rendered}`;
    }).join(' ');
  }
}
