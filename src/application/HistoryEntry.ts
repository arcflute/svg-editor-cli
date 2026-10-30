import type { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

/** Owns immutable-by-encapsulation snapshots, separate from every active candidate. */
export class HistoryEntry {
  readonly #command: EditCommand;
  readonly #before: SvgDocument;
  readonly #after: SvgDocument;
  readonly #output: readonly string[];

  public constructor(command: EditCommand, before: SvgDocument, after: SvgDocument, output: readonly string[]) {
    this.#command = command;
    this.#before = before.clone();
    this.#after = after.clone();
    this.#output = Object.freeze([...output]);
  }

  public restoreBefore(): SvgDocument { return this.#before.clone(); }
  public restoreAfter(): SvgDocument { return this.#after.clone(); }
  public undoOutput(): readonly string[] { return Object.freeze([`undone: ${this.#command.intent}`]); }
  public redoOutput(): readonly string[] { return this.#output; }
}
