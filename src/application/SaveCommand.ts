import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class SaveCommand extends Command {
  public static readonly syntax = 'save [file.svg]';
  public constructor(private readonly path?: string) { super(); }
  public static parse(args: readonly CommandToken[]): SaveCommand {
    ArgumentParser.count(args, 0, 1, this.syntax);
    return new SaveCommand(args[0] === undefined ? undefined : ArgumentParser.identifier(args[0], 'file'));
  }
  public override execute(session: EditorSession): readonly string[] { return session.save(this.path); }
}
