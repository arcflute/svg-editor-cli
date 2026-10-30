import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class MoveCommand extends EditCommand {
  public static readonly syntax = 'move <id> <dx> <dy>';

  public constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }

  public static parse(args: readonly CommandToken[]): MoveCommand {
    ArgumentParser.count(args, 3, 3, this.syntax);
    return new MoveCommand(ArgumentParser.identifier(args[0]!), ArgumentParser.number(args[1]!, 'dx'),
      ArgumentParser.number(args[2]!, 'dy'));
  }

  public override apply(candidate: SvgDocument): readonly string[] {
    const shape = candidate.require(this.id);
    shape.move(this.dx, this.dy);
    return [`${shape.type}#${shape.id} moved by (${this.dx},${this.dy})`];
  }
}
