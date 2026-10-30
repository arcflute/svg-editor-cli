/** Format-neutral values: no XML library objects or escaping in the model. */
export interface ShapeElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string | number>>;
  readonly text: string | undefined;
  readonly children: readonly ShapeElement[];
}
