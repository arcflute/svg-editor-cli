import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class DeleteCommand extends EditCommand {
  public static readonly syntax = 'delete <id>';

  public constructor(private readonly id: string) { super(`delete ${id}`); }

  public static parse(args: readonly CommandToken[]): DeleteCommand {
    ArgumentParser.count(args, 1, 1, this.syntax);
    return new DeleteCommand(ArgumentParser.identifier(args[0]!));
  }

  public override apply(candidate: SvgDocument): readonly string[] {
    const shape = candidate.remove(this.id);
    return [`${shape.type}#${shape.id} deleted`];
  }
}
