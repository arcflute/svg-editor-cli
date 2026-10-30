import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class BackCommand extends EditCommand {
  public static readonly syntax = 'back <id>';
  public constructor(private readonly id: string) { super(`back ${id}`); }
  public static parse(args: readonly CommandToken[]): BackCommand {
    ArgumentParser.count(args, 1, 1, this.syntax);
    return new BackCommand(ArgumentParser.identifier(args[0]!));
  }
  public override apply(candidate: SvgDocument): readonly string[] {
    candidate.reorder(this.id, 'back');
    return [`shape#${this.id} moved to back`];
  }
}
