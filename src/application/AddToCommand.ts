import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class AddToCommand extends EditCommand {
  public static readonly syntax = 'addto <gid> <id>';
  public constructor(private readonly parentId: string, private readonly id: string) { super(`addto ${parentId} ${id}`); }
  public static parse(args: readonly CommandToken[]): AddToCommand {
    ArgumentParser.count(args, 2, 2, this.syntax);
    return new AddToCommand(ArgumentParser.identifier(args[0]!), ArgumentParser.identifier(args[1]!));
  }
  public override apply(candidate: SvgDocument): readonly string[] {
    candidate.reparent(this.id, this.parentId);
    return [`${candidate.require(this.id).type}#${this.id} added to g#${this.parentId}`];
  }
}
