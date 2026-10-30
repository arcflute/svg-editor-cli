import { InputError } from './InputError.js';
import type { HistoryEntry } from './HistoryEntry.js';
import type { HistoryStatus } from './HistoryStatus.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

interface HistoryTransition {
  readonly document: SvgDocument;
  readonly history: HistoryManager;
  readonly output: readonly string[];
}

/** A history value: every transition prepares a new instance without modifying the old stacks. */
export class HistoryManager {
  readonly #undo: readonly HistoryEntry[];
  readonly #redo: readonly HistoryEntry[];
  readonly #blocked: boolean;

  private constructor(undo: readonly HistoryEntry[], redo: readonly HistoryEntry[], blocked: boolean) {
    this.#undo = Object.freeze([...undo]);
    this.#redo = Object.freeze([...redo]);
    this.#blocked = blocked;
  }

  public static afterDocumentOperation(): HistoryManager { return new HistoryManager([], [], true); }

  public status(): HistoryStatus {
    return Object.freeze({ undoCount: this.#undo.length, redoCount: this.#redo.length, blocked: this.#blocked });
  }

  public record(entry: HistoryEntry): HistoryManager {
    return new HistoryManager([...this.#undo, entry], [], false);
  }

  public undo(): HistoryTransition {
    this.ensureAllowed();
    const entry = this.#undo.at(-1);
    if (entry === undefined) throw new InputError('nothing to undo');
    const document = entry.restoreBefore();
    const history = new HistoryManager(this.#undo.slice(0, -1), [...this.#redo, entry], false);
    return Object.freeze({ document, history, output: entry.undoOutput() });
  }

  public redo(): HistoryTransition {
    this.ensureAllowed();
    const entry = this.#redo.at(-1);
    if (entry === undefined) throw new InputError('nothing to redo');
    const document = entry.restoreAfter();
    const history = new HistoryManager([...this.#undo, entry], this.#redo.slice(0, -1), false);
    return Object.freeze({ document, history, output: entry.redoOutput() });
  }

  private ensureAllowed(): void {
    if (this.#blocked) throw new InputError('undo not allowed after io command');
  }
}
