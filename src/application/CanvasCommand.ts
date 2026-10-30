import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';

export class CanvasCommand extends Command {
  public static readonly syntax = 'canvas [w h]';
  public constructor(private readonly width?: number, private readonly height?: number) { super(); }
  public static parse(args: readonly CommandToken[]): CanvasCommand {
    if (args.length === 0) return new CanvasCommand();
    ArgumentParser.count(args, 2, 2, this.syntax);
    return new CanvasCommand(ArgumentParser.number(args[0]!, 'width'), ArgumentParser.number(args[1]!, 'height'));
  }
  public override execute(session: EditorSession): readonly string[] { return session.canvas(this.width, this.height); }
}
