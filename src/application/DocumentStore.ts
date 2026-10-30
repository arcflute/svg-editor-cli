export interface DocumentStore {
  resolve(path: string): string;
  read(path: string): string;
  /** Failure leaves the previous target file intact. */
  writeAtomic(path: string, contents: string): void;
}
