import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class FrontCommand extends EditCommand {
  public static readonly syntax = 'front <id>';
  public constructor(private readonly id: string) { super(`front ${id}`); }
  public static parse(args: readonly CommandToken[]): FrontCommand {
    ArgumentParser.count(args, 1, 1, this.syntax);
    return new FrontCommand(ArgumentParser.identifier(args[0]!));
  }
  public override apply(candidate: SvgDocument): readonly string[] {
    candidate.reorder(this.id, 'front');
    return [`shape#${this.id} moved to front`];
  }
}
