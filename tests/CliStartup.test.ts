import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

describe('CLI process smoke tests', () => {
  it('starts the actual entry point, prints the prompt and exits on EOF', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/bootstrap/main.ts'], {
      cwd: projectRoot,
      input: '',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('svg-editor 0.1');
    expect(result.stdout).toContain('svg> ');
    expect(result.stderr).toBe('');
  });

  it('recovers after invalid input, reads CRLF lines, and executes an unterminated final query', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/bootstrap/main.ts'], {
      cwd: projectRoot,
      input: '\r\n# ignored\r\ncreate g no-document\r\ninit 800 600\r\ncreate g good\r\nshow missing\r\ntree',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stderr.trim().split(/\r?\n/)).toEqual([
      "error: no document. use 'init' or 'read' first",
      'error: no such shape: missing',
    ]);
    expect(result.stdout.match(/svg> /g)).toHaveLength(8);
    expect(result.stdout).toContain('canvas 800x600 created');
    expect(result.stdout).toContain('g#good created');
    expect(result.stdout).toContain('svg (800x600)\n└── g#good');
    expect(result.stdout).not.toContain('no-document created');
  });

  it('replays the actual round3 file through stdin with fixed eight-element tree and parent expectations', () => {
    const script = readFileSync(new URL('../examples/round3.commands.txt', import.meta.url), 'utf8');
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/bootstrap/main.ts'], {
      cwd: projectRoot, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.match(/(?:g|rect|text|line)#[\w-]+ created/g)).toHaveLength(8);
    expect(result.stdout).toContain([
      'svg (800x600)',
      '└── g#flowchart',
      '    ├── g#node1',
      '    │   ├── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9',
      '    │   └── text#start-label  (155,135) "开始"',
      '    ├── g#node2',
      '    │   ├── rect#process  x=520 y=100 w=160 h=60 fill=#f5a623',
      '    │   └── text#process-label  (545,135) "处理数据"',
      '    └── line#arrow1  (280,130) -> (520,130) stroke=black',
    ].join('\n'));
    expect(result.stdout).toContain('g#node2\n├── rect#process  x=520 y=100 w=160 h=60 fill=#f5a623\n└── text#process-label  (545,135) "处理数据"');
    expect(result.stdout).toContain('text#start-label  parent=g#node1\n  x=155 y=135 text="开始"');
    expect(result.stdout).toContain('create text <id> <x> <y> "content" [in <containerId>]');
    expect(result.stdout).toContain('undo — undo an edit [not implemented yet]');
  });

  it('drains a burst of commands before EOF in the same process', () => {
    const script = ['init', ...Array.from({ length: 60 }, (_, i) => `create g g${i}`), 'tree'].join('\n');
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/bootstrap/main.ts'], {
      cwd: projectRoot, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const created = [...result.stdout.matchAll(/g#(g\d+) created/g)].map(match => match[1]);
    expect(created).toEqual(Array.from({ length: 60 }, (_, i) => `g${i}`));
    expect(result.stdout).toContain('├── g#g58\n└── g#g59');
  });

  it('handles lexical errors, escapes, comments and colors while keeping errors on one line', () => {
    const script = [
      ' \t# 注释', 'init', 'create text bad 0 0 "unfinished',
      String.raw`create text t 1 2 "say \"hi\" C:\\tmp"`,
      'create rect r 0 0 1 1 #ffffff', 'show t', 'show r', '"bad\u2028line"', 'help',
    ].join('\n');
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/bootstrap/main.ts'], {
      cwd: projectRoot, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('error: unterminated double quote\nerror: unknown command: bad line\n');
    expect(result.stdout).toContain(String.raw`text="say \"hi\" C:\\tmp"`);
    expect(result.stdout).toContain('fill=#ffffff');
    expect(result.stdout).not.toContain('text#bad created');
    expect(result.stdout).toContain('Commands:');
  });
});
