/** Temporary parser transport, never used as a mutable domain shape. */
export interface XmlElement {
  readonly name: string;
  readonly attributes: Record<string, string>;
  readonly children: XmlElement[];
  text: string;
}
