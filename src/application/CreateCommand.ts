import { ArgumentParser } from './ArgumentParser.js';
import { EditCommand } from './EditCommand.js';
import { InputError } from './InputError.js';
import type { CommandToken } from './CommandToken.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';

export class CreateCommand extends EditCommand {
  public static readonly syntax = 'create <type> <id> [params...] [in <containerId>]';
  readonly #attributes: Readonly<Record<string, string | number>>;

  public constructor(private readonly type: string, private readonly id: string,
    attributes: Readonly<Record<string, string | number>>, private readonly parentId?: string) {
    super();
    this.#attributes = Object.freeze({ ...attributes });
  }

  public static parse(args: readonly CommandToken[], factory: ShapeFactory): CreateCommand {
    ArgumentParser.count(args, 2, Number.MAX_SAFE_INTEGER, this.syntax);
    const type = args[0]!.value;
    const description = factory.describe(type);
    const id = ArgumentParser.identifier(args[1]!);
    let parameters = args.slice(2);
    let parentId: string | undefined;
    const marker = parameters.at(-2);
    if (marker?.value === 'in' && !marker.quoted) {
      parentId = ArgumentParser.identifier(parameters.at(-1)!, 'container id');
      parameters = parameters.slice(0, -2);
    } else if (parameters.at(-1)?.value === 'in' && !parameters.at(-1)!.quoted) {
      throw new InputError('expected container id after in');
    }
    return new CreateCommand(type, id, ArgumentParser.shapeAttributes(parameters, description), parentId);
  }

  public override apply(candidate: SvgDocument, factory: ShapeFactory): readonly string[] {
    const shape = factory.create(this.type, this.id, this.#attributes);
    candidate.insert(shape, this.parentId);
    return [`${shape.type}#${shape.id} created${this.parentId === undefined ? '' : ` in g#${this.parentId}`}`];
  }
}
