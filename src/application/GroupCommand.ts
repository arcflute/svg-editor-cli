import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';

export class GroupCommand extends EditCommand {
  public static readonly syntax = 'group <newGid> <id1> <id2>...';
  readonly #ids: readonly string[];
  public constructor(private readonly id: string, ids: readonly string[]) {
    super(`group ${id}`);
    this.#ids = Object.freeze([...ids]);
  }
  public static parse(args: readonly CommandToken[]): GroupCommand {
    ArgumentParser.count(args, 2, Number.MAX_SAFE_INTEGER, this.syntax);
    return new GroupCommand(ArgumentParser.identifier(args[0]!), args.slice(1).map(token => ArgumentParser.identifier(token)));
  }
  public override apply(candidate: SvgDocument, factory: ShapeFactory): readonly string[] {
    candidate.group(factory.create('g', this.id), this.#ids);
    return [`g#${this.id} grouped ${this.#ids.length} shapes`];
  }
}
