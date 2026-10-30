import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import { TextPresenter } from './TextPresenter.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class SetCommand extends EditCommand {
  public static readonly syntax = 'set <id> <attr> <value>';
  readonly #value: CommandToken;

  public constructor(private readonly id: string, private readonly attribute: string, value: CommandToken) {
    super(`set ${id} ${attribute}`);
    this.#value = Object.freeze({ ...value });
  }

  public static parse(args: readonly CommandToken[]): SetCommand {
    ArgumentParser.count(args, 3, 3, this.syntax);
    return new SetCommand(ArgumentParser.identifier(args[0]!), ArgumentParser.identifier(args[1]!, 'attribute'), args[2]!);
  }

  public override apply(candidate: SvgDocument): readonly string[] {
    const shape = candidate.require(this.id);
    const value = shape.attributeKind(this.attribute) === 'number'
      ? ArgumentParser.number(this.#value, this.attribute) : this.#value.value;
    shape.set(this.attribute, value);
    return [`${shape.type}#${shape.id} updated: ${new TextPresenter().attribute(this.attribute, value)}`];
  }
}
