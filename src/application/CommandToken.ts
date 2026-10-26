/** Application input contract; tokenization is an outer adapter's responsibility. */
export interface CommandToken {
  readonly value: string;
  readonly quoted: boolean;
}
