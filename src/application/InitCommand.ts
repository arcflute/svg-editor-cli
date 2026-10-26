import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class InitCommand extends Command {
  public static readonly syntax = 'init [w] [h]';
  public constructor(private readonly width: number, private readonly height: number) { super(); }

  public static parse(args: readonly CommandToken[]): InitCommand {
    ArgumentParser.count(args, 0, 2, this.syntax);
    return new InitCommand(args[0] === undefined ? 800 : ArgumentParser.number(args[0], 'width'),
      args[1] === undefined ? 600 : ArgumentParser.number(args[1], 'height'));
  }

  public override execute(session: EditorSession): readonly string[] {
    const canvas = session.initialize(this.width, this.height);
    return Object.freeze([`canvas ${canvas.width}x${canvas.height} created`]);
  }
}
