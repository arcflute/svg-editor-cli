import type { ShapeDescription } from '../domain/ShapeDescription.js';

export interface TreeNodeView {
  readonly shape: ShapeDescription;
  readonly children: readonly TreeNodeView[];
}

export interface TreeView {
  readonly canvas: Readonly<{ width: number; height: number }> | null;
  readonly nodes: readonly TreeNodeView[];
}

export interface ShowView {
  readonly shape: ShapeDescription;
  readonly parent: string;
}
