import { CreateCommand } from './CreateCommand.js';
import { DeleteCommand } from './DeleteCommand.js';
import { HelpCommand } from './HelpCommand.js';
import { InitCommand } from './InitCommand.js';
import { MoveCommand } from './MoveCommand.js';
import { ScaleCommand } from './ScaleCommand.js';
import { SetCommand } from './SetCommand.js';
import { InputError } from './InputError.js';
import { ShowCommand } from './ShowCommand.js';
import { TreeCommand } from './TreeCommand.js';
import type { Command } from './Command.js';
import type { CommandDescription } from './CommandDescription.js';
import type { CommandToken } from './CommandToken.js';
import type { EditorSession } from './EditorSession.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';

interface CommandDefinition {
  readonly syntax: string;
  readonly description: string;
  readonly requiresDocument?: boolean;
  readonly parse?: (args: readonly CommandToken[]) => Command;
}

/** The sole command-name dispatch; pending commands have metadata, not empty classes. */
export class CommandDispatcher {
  readonly #definitions: ReadonlyMap<string, CommandDefinition>;

  public constructor(private readonly session: EditorSession, factory: ShapeFactory) {
    this.#definitions = new Map<string, CommandDefinition>([
      ['init', { syntax: InitCommand.syntax, description: 'create an empty canvas', parse: args => InitCommand.parse(args) }],
      ['read', { syntax: 'read <file.svg>', description: 'read SVG' }],
      ['save', { syntax: 'save [file.svg]', description: 'save SVG' }],
      ['canvas', { syntax: 'canvas [w] [h]', description: 'query or resize canvas' }],
      ['create', { syntax: CreateCommand.syntax, description: 'create a shape', requiresDocument: true, parse: args => CreateCommand.parse(args, factory) }],
      ['delete', { syntax: DeleteCommand.syntax, description: 'delete a subtree', requiresDocument: true, parse: args => DeleteCommand.parse(args) }],
      ['move', { syntax: MoveCommand.syntax, description: 'translate a shape', requiresDocument: true, parse: args => MoveCommand.parse(args) }],
      ['scale', { syntax: ScaleCommand.syntax, description: 'scale geometry', requiresDocument: true, parse: args => ScaleCommand.parse(args) }],
      ['set', { syntax: SetCommand.syntax, description: 'set an attribute', requiresDocument: true, parse: args => SetCommand.parse(args) }],
      ['group', { syntax: 'group <newGid> <id1> <id2>...', description: 'group existing shapes' }],
      ['ungroup', { syntax: 'ungroup <gid>', description: 'ungroup a nested container' }],
      ['addto', { syntax: 'addto <gid> <id>', description: 'reparent a shape' }],
      ['front', { syntax: 'front <id>', description: 'move to front among siblings' }],
      ['back', { syntax: 'back <id>', description: 'move to back among siblings' }],
      ['tree', { syntax: TreeCommand.syntax, description: 'show document or subtree', requiresDocument: true, parse: args => TreeCommand.parse(args) }],
      ['show', { syntax: ShowCommand.syntax, description: 'show attributes and parent', requiresDocument: true, parse: args => ShowCommand.parse(args) }],
      ['help', { syntax: HelpCommand.syntax, description: 'show commands', parse: args => HelpCommand.parse(args, this.descriptions(), factory.descriptions()) }],
      ['undo', { syntax: 'undo', description: 'undo an edit' }],
      ['redo', { syntax: 'redo', description: 'redo an edit' }],
    ]);
  }

  public execute(tokens: readonly CommandToken[]): readonly string[] {
    const name = tokens[0]?.value;
    if (name === undefined) return Object.freeze([]);
    const definition = this.#definitions.get(name);
    if (definition === undefined) throw new InputError(`unknown command: ${name}`);
    if (definition.parse === undefined) throw new InputError(`command not implemented yet: ${name}`);
    if (definition.requiresDocument) this.session.ensureDocument();
    return definition.parse(tokens.slice(1)).execute(this.session);
  }

  private descriptions(): readonly CommandDescription[] {
    return Object.freeze([...this.#definitions.values()].map(definition => Object.freeze({
      syntax: definition.syntax, description: definition.description, implemented: definition.parse !== undefined,
    })));
  }
}
