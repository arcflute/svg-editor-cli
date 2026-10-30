import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class UndoCommand extends Command {
  public static readonly syntax = 'undo';

  public static parse(args: readonly CommandToken[]): UndoCommand {
    ArgumentParser.count(args, 0, 0, this.syntax);
    return new UndoCommand();
  }

  public override execute(session: EditorSession): readonly string[] { return session.undo(); }
}
