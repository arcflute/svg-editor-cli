import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class ScaleCommand extends EditCommand {
  public static readonly syntax = 'scale <id> <factor>';

  public constructor(private readonly id: string, private readonly factor: number) { super(`scale ${id} by ${factor}`); }

  public static parse(args: readonly CommandToken[]): ScaleCommand {
    ArgumentParser.count(args, 2, 2, this.syntax);
    return new ScaleCommand(ArgumentParser.identifier(args[0]!), ArgumentParser.number(args[1]!, 'factor'));
  }

  public override apply(candidate: SvgDocument): readonly string[] {
    const shape = candidate.require(this.id);
    shape.scale(this.factor);
    return [`${shape.type}#${shape.id} scaled by ${this.factor}`];
  }
}
