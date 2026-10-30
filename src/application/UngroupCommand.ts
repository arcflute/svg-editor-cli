import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class UngroupCommand extends EditCommand {
  public static readonly syntax = 'ungroup <gid>';
  public constructor(private readonly id: string) { super(`ungroup ${id}`); }
  public static parse(args: readonly CommandToken[]): UngroupCommand {
    ArgumentParser.count(args, 1, 1, this.syntax);
    return new UngroupCommand(ArgumentParser.identifier(args[0]!));
  }
  public override apply(candidate: SvgDocument): readonly string[] {
    candidate.ungroup(this.id);
    return [`g#${this.id} ungrouped`];
  }
}
