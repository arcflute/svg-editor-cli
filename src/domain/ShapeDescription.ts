/** Read-only presentation values, independent of terminal syntax and active model instances. */
export interface GeometryDescription {
  readonly fields?: Readonly<Record<string, number>>;
  readonly points?: readonly Readonly<{ x: number; y: number }>[];
  readonly text?: string;
}

export interface ShapeDescription {
  readonly id: string;
  readonly type: string;
  readonly geometry: GeometryDescription;
  readonly attributes: Readonly<Record<string, string | number>>;
  readonly style: Readonly<Record<string, string | number>>;
}
