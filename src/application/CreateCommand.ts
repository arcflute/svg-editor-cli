import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import { InputError } from './InputError.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';

export class CreateCommand extends Command {
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

  public override execute(session: EditorSession): readonly string[] {
    const created = session.create(this.type, this.id, this.#attributes, this.parentId);
    return Object.freeze([`${created.type}#${created.id} created${created.parent === null ? '' : ` in g#${created.parent}`}`]);
  }
}
