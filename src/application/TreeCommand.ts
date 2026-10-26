import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import { TextPresenter } from './TextPresenter.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class TreeCommand extends Command {
  public static readonly syntax = 'tree [id]';
  public constructor(private readonly id?: string) { super(); }

  public static parse(args: readonly CommandToken[]): TreeCommand {
    ArgumentParser.count(args, 0, 1, this.syntax);
    return new TreeCommand(args[0] === undefined ? undefined : ArgumentParser.identifier(args[0]));
  }

  public override execute(session: EditorSession): readonly string[] {
    return new TextPresenter().tree(session.readTree(this.id));
  }
}
