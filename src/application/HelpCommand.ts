import { ArgumentParser } from './ArgumentParser.js';
import { Command } from './Command.js';
import type { CommandDescription } from './CommandDescription.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';
import type { ShapeTypeDescription } from '../domain/ShapeTypeDescription.js';

export class HelpCommand extends Command {
  public static readonly syntax = 'help';
  readonly #lines: readonly string[];

  public constructor(commands: readonly CommandDescription[], shapes: readonly ShapeTypeDescription[]) {
    super();
    this.#lines = Object.freeze([
      'Commands:',
      ...commands.map(command => `  ${command.syntax} — ${command.description}${command.implemented ? '' : ' [not implemented yet]'}`),
      'Built-in create forms:',
      ...shapes.map(shape => `  ${ArgumentParser.shapeSyntax(shape)}`),
      'Whole-line # comments only; no trailing comments. EOF ends the session.',
    ]);
  }

  public static parse(args: readonly CommandToken[], commands: readonly CommandDescription[], shapes: readonly ShapeTypeDescription[]): HelpCommand {
    ArgumentParser.count(args, 0, 0, this.syntax);
    return new HelpCommand(commands, shapes);
  }

  public override execute(_session: EditorSession): readonly string[] { return this.#lines; }
}
