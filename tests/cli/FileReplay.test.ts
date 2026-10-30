import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directories: string[] = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });

it('replays real files with quoted paths, IO barriers, warnings, errors and EOF', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-cli-')); directories.push(directory);
  writeFileSync(join(directory, 'external.svg'), '<svg width="10" height="20"><rect x="1" y="2" width="3" height="4"/><g id="rect1"/></svg>');
  const result = spawnSync(process.execPath, ['--import', new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
    fileURLToPath(new URL('../../src/bootstrap/main.ts', import.meta.url))], {
    cwd: directory, encoding: 'utf8', timeout: 10_000,
    input: ['init', 'create g scene', 'create text t 10 20 "中文 <&>" in scene', 'save "my image.svg"', 'undo',
      'canvas', 'canvas 400 300', 'redo', 'move t 1 2', 'undo', 'read "my image.svg"', 'tree', 'save',
      'read missing.svg', 'save "missing/out.svg"', 'read external.svg', 'show rect2', 'save generated.svg'].join('\n'),
  });
  expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
  expect(result.stderr.trim().split(/\r?\n/)).toEqual(['error: undo not allowed after io command',
    'error: undo not allowed after io command', 'error: cannot read file: missing.svg', 'error: cannot write file: missing/out.svg']);
  expect(result.stdout).toContain('warning: assigned id rect2 to unnamed <rect>');
  expect(result.stdout).toContain('rect#rect2  parent=svg');
  expect(result.stdout).toContain('text#t  (10,20) "中文 <&>"');
  expect(readFileSync(join(directory, 'my image.svg'), 'utf8')).toContain('中文 &lt;&amp;&gt;');
  expect(readFileSync(join(directory, 'generated.svg'), 'utf8')).toContain('id="rect2"');
});
