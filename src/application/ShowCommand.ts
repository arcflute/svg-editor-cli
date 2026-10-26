import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import { TextPresenter } from './TextPresenter.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class ShowCommand extends Command {
  public static readonly syntax = 'show <id>';
  public constructor(private readonly id: string) { super(); }

  public static parse(args: readonly CommandToken[]): ShowCommand {
    ArgumentParser.count(args, 1, 1, this.syntax);
    return new ShowCommand(ArgumentParser.identifier(args[0]!));
  }

  public override execute(session: EditorSession): readonly string[] {
    return new TextPresenter().show(session.readShape(this.id));
  }
}
