import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class ReadCommand extends Command {
  public static readonly syntax = 'read <file.svg>';
  public constructor(private readonly path: string) { super(); }
  public static parse(args: readonly CommandToken[]): ReadCommand {
    ArgumentParser.count(args, 1, 1, this.syntax);
    return new ReadCommand(ArgumentParser.identifier(args[0]!, 'file'));
  }
  public override execute(session: EditorSession): readonly string[] { return session.read(this.path); }
}
