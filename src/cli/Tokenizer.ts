import type { CommandToken } from '../application/CommandToken.js';

export class Tokenizer {
  public tokenize(line: string): readonly CommandToken[] {
    const tokens: CommandToken[] = [];
    let cursor = 0;
    while (cursor < line.length && /\s/u.test(line[cursor]!)) cursor++;
    if (line[cursor] === '#') return Object.freeze(tokens);

    while (cursor < line.length) {
      while (cursor < line.length && /\s/u.test(line[cursor]!)) cursor++;
      if (cursor === line.length) break;
      const quoted = line[cursor] === '"';
      let value = '';
      if (quoted) {
        cursor++;
        let closed = false;
        while (cursor < line.length) {
          const character = line[cursor++]!;
          if (character === '"') { closed = true; break; }
          if (character === '\\') {
            const escaped = line[cursor++];
            if (escaped !== '"' && escaped !== '\\') throw new SyntaxError('only \\" and \\\\ escapes are supported inside quotes');
            value += escaped;
          } else {
            value += character;
          }
        }
        if (!closed) throw new SyntaxError('unterminated double quote');
        if (cursor < line.length && !/\s/u.test(line[cursor]!)) throw new SyntaxError('quoted arguments must be separated by whitespace');
      } else {
        while (cursor < line.length && !/\s/u.test(line[cursor]!)) {
          if (line[cursor] === '"') throw new SyntaxError('quoted arguments must be separated by whitespace');
          value += line[cursor++]!;
        }
      }
      tokens.push(Object.freeze({ value, quoted }));
    }
    return Object.freeze(tokens);
  }
}
