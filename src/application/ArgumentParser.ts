import { InputError } from './InputError.js';
import type { CommandToken } from './CommandToken.js';
import type { ShapeTypeDescription } from '../domain/ShapeTypeDescription.js';

export class ArgumentParser {
  public static count(tokens: readonly CommandToken[], minimum: number, maximum: number, syntax: string): void {
    if (tokens.length < minimum || tokens.length > maximum) throw new InputError(`usage: ${syntax}`);
  }

  public static number(token: CommandToken, name: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token.value) || !Number.isFinite(Number(token.value))) {
      throw new InputError(`${name} must be a finite number`);
    }
    return Number(token.value);
  }

  public static identifier(token: CommandToken, name = 'id'): string {
    if (token.value.trim().length === 0) throw new InputError(`${name} must not be empty`);
    return token.value;
  }

  public static shapeSyntax(description: ShapeTypeDescription): string {
    const parameters = description.parameters.map(parameter => {
      if (parameter.optional) return `[${parameter.name}]`;
      return parameter.kind === 'text' ? `"${parameter.name}"` : `<${parameter.name}>`;
    });
    return [`create ${description.type} <id>`, ...parameters, '[in <containerId>]'].join(' ');
  }

  public static shapeAttributes(tokens: readonly CommandToken[], description: ShapeTypeDescription): Readonly<Record<string, string | number>> {
    const required = description.parameters.filter(parameter => !parameter.optional).length;
    this.count(tokens, required, description.parameters.length, this.shapeSyntax(description));
    const attributes: Record<string, string | number> = {};
    description.parameters.forEach((parameter, index) => {
      const token = tokens[index];
      if (token === undefined) return;
      if (parameter.kind === 'text' && !token.quoted) throw new InputError(`${parameter.name} must be double-quoted`);
      attributes[parameter.attribute] = parameter.kind === 'number' ? this.number(token, parameter.name) : token.value;
    });
    return Object.freeze(attributes);
  }
}
