export interface ShapeParameter {
  readonly name: string;
  readonly attribute: string;
  readonly kind: 'number' | 'text' | 'paint';
  readonly optional?: boolean;
}

export interface ShapeTypeDescription {
  readonly type: string;
  readonly parameters: readonly ShapeParameter[];
}
