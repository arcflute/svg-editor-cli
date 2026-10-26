import type { EditorSession } from './EditorSession.js';

export abstract class Command {
  public abstract execute(session: EditorSession): readonly string[];
}
