import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileDocumentStore } from '../../src/infrastructure/FileDocumentStore.js';

vi.mock('node:fs', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs')>();
  return { ...original, renameSync: vi.fn(original.renameSync) };
});
const directories: string[] = [];
const temporary = () => { const path = mkdtempSync(join(tmpdir(), 'svg-store-')); directories.push(path); return path; };
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); vi.clearAllMocks(); });

it('writes UTF-8, atomically replaces a file and leaves no temporary artifacts', () => {
  const directory = temporary(); const file = join(directory, '中文 space.svg'); const store = new FileDocumentStore();
  store.writeAtomic(file, '<svg>中文</svg>'); expect(store.read(file)).toBe('<svg>中文</svg>');
  store.writeAtomic(file, '<svg>替换</svg>'); expect(readFileSync(file, 'utf8')).toBe('<svg>替换</svg>');
  expect(readdirSync(directory)).toEqual(['中文 space.svg']);
});

it('retains the existing target and removes only its own temporary file when replacement fails', () => {
  const directory = temporary(); const file = join(directory, 'kept.svg'); const store = new FileDocumentStore();
  writeFileSync(file, 'original'); writeFileSync(join(directory, 'unrelated.tmp'), 'keep');
  vi.mocked(renameSync).mockImplementationOnce(() => { throw new Error('replacement failed'); });
  expect(() => store.writeAtomic(file, 'new')).toThrow('replacement failed');
  expect(readFileSync(file, 'utf8')).toBe('original');
  expect(readdirSync(directory).sort()).toEqual(['kept.svg', 'unrelated.tmp']);
});

it('fails for missing parent directories and invalid UTF-8 instead of silently changing text', () => {
  const directory = temporary(); const store = new FileDocumentStore();
  expect(() => store.writeAtomic(join(directory, 'missing', 'x.svg'), 'new')).toThrow();
  expect(readdirSync(directory)).toEqual([]);
  const invalid = join(directory, 'invalid.svg'); writeFileSync(invalid, Buffer.from([0xc0, 0xaf]));
  expect(() => store.read(invalid)).toThrow();
});
