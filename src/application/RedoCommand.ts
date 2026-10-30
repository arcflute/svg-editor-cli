import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class RedoCommand extends Command {
  public static readonly syntax = 'redo';

  public static parse(args: readonly CommandToken[]): RedoCommand {
    ArgumentParser.count(args, 0, 0, this.syntax);
    return new RedoCommand();
  }

  public override execute(session: EditorSession): readonly string[] { return session.redo(); }
}
