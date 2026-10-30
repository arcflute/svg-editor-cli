import { Command } from './Command.js';
import type { EditorSession } from './EditorSession.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

/** Editing commands receive an isolated candidate, never the session's active document. */
export abstract class EditCommand extends Command {
  readonly #intent: string;

  protected constructor(intent: string) {
    super();
    this.#intent = intent;
  }

  public get intent(): string { return this.#intent; }

  public override execute(session: EditorSession): readonly string[] {
    return session.executeEdit(this);
  }

  public abstract apply(candidate: SvgDocument, factory: ShapeFactory): readonly string[];
}
