import { describe, expect, it } from 'vitest';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

const tokenizer = new Tokenizer();

describe('Tokenizer', () => {
  it.each(['', '  \t ', '# comment', ' \t # 注释'])('ignores blank or whole comment line %j', line => {
    expect(tokenizer.tokenize(line)).toEqual([]);
  });

  it('preserves quoted Chinese, surrounding spaces, and the empty string', () => {
    expect(tokenizer.tokenize('create text t 10 20 "  中文 空格  " ""')).toEqual([
      { value: 'create', quoted: false }, { value: 'text', quoted: false }, { value: 't', quoted: false },
      { value: '10', quoted: false }, { value: '20', quoted: false },
      { value: '  中文 空格  ', quoted: true }, { value: '', quoted: true },
    ]);
  });

  it('retains colors, internal # parameters, and quoted in provenance', () => {
    expect(tokenizer.tokenize('set r fill #ffffff # trailing')).toEqual([
      { value: 'set', quoted: false }, { value: 'r', quoted: false }, { value: 'fill', quoted: false },
      { value: '#ffffff', quoted: false }, { value: '#', quoted: false }, { value: 'trailing', quoted: false },
    ]);
    expect(tokenizer.tokenize('"in" in')).toEqual([{ value: 'in', quoted: true }, { value: 'in', quoted: false }]);
  });

  it('decodes quote and backslash escapes only inside quotes', () => {
    expect(tokenizer.tokenize(String.raw`"say \"hi\" at C:\\tmp" C:\tmp`)).toEqual([
      { value: 'say "hi" at C:\\tmp', quoted: true }, { value: 'C:\\tmp', quoted: false },
    ]);
  });

  it.each([String.raw`"bad\n"`, String.raw`"bad\q"`, '"tail\\'])('rejects unsupported or incomplete escape %j', line => {
    expect(() => tokenizer.tokenize(line)).toThrow(SyntaxError);
  });

  it.each(['"unfinished', 'a"b"', '"a"b', '"a""b"', '""tail'])('rejects unclosed or adjacent quote fragments %j', line => {
    expect(() => tokenizer.tokenize(line)).toThrow(SyntaxError);
  });

  it('returns immutable tokens and a separate array on each call', () => {
    const tokens = tokenizer.tokenize('help');
    expect(() => Object.assign(tokens[0]!, { value: 'init' })).toThrow(TypeError);
    expect(() => (tokens as unknown[]).push('extra')).toThrow(TypeError);
    expect(tokenizer.tokenize('help')).not.toBe(tokens);
  });
});
