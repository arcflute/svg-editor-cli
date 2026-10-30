import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));

function replay(input: string) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/bootstrap/main.ts'], {
    cwd: root, input, encoding: 'utf8', timeout: 10_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  return result;
}

describe('round 4 CLI replay', () => {
  it('replays the real script with fixed movement, restoration, styles and sibling order', () => {
    const script = readFileSync(new URL('../../examples/round4.commands.txt', import.meta.url), 'utf8');
    const result = replay(script);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('g#node2 moved by (0,100)');
    expect(result.stdout).toContain('g#node2\n├── rect#process  x=520 y=200 w=160 h=60 fill=#f5a623\n└── text#process-label  (545,235) "处理数据"');
    expect(result.stdout).toContain('undone: move node2 by (0,100)\nsvg> g#node2\n├── rect#process  x=520 y=100 w=160 h=60 fill=#f5a623');
    expect(result.stdout).toContain('g#node1 deleted');
    expect(result.stdout).toContain([
      'undone: delete node1', 'svg> svg (800x600)', '└── g#flowchart',
      '    ├── g#node1',
      '    │   ├── rect#start  x=60 y=50 w=80 h=30 fill=#4a90d9',
      '    │   └── text#start-label  (77.5,67.5) "开始"',
      '    ├── g#node2  stroke-width=2',
      '    │   ├── rect#process  x=520 y=200 w=160 h=60 fill=#f5a623',
      '    │   └── text#process-label  (545,235) "处理数据 v2"',
      '    └── line#arrow1  (280,130) -> (520,130) stroke=black',
    ].join('\n'));
    expect(result.stdout).toContain('  undo — undo an edit\n');
    expect(result.stdout).toContain('  save [file.svg] — save SVG [not implemented yet]');
  });

  it('recovers from errors without clearing redo or unlocking a document barrier', () => {
    const result = replay([
      'init', 'undo', 'create rect r 1 2 3 4', 'move r 5 6', 'undo', 'scale r 0', 'redo',
      'show r', 'set r id bad', 'delete missing', 'init 100 200', 'create circle bad 0 0 -1',
      'redo', 'create g good', 'undo', 'tree',
    ].join('\r\n'));
    expect(result.stderr.trim().split(/\r?\n/)).toEqual([
      'error: undo not allowed after io command', 'error: scale factor must be positive',
      'error: unknown attribute: id', 'error: no such shape: missing',
      'error: r must be non-negative', 'error: undo not allowed after io command',
    ]);
    expect(result.stdout).toContain('rect#r  parent=svg\n  x=6 y=8 width=3 height=4');
    expect(result.stdout).toContain('undone: create g#good\nsvg> svg (100x200)');
    expect(result.stdout).not.toContain('circle#bad created');
  });

  it('drains rapid edits and all undo/redo requests before an unterminated EOF', () => {
    const edits = Array.from({ length: 30 }, () => 'move r 1 2');
    const result = replay(['init', 'create rect r 0 0 1 1', ...edits,
      ...Array.from({ length: 30 }, () => 'undo'), 'show r',
      ...Array.from({ length: 30 }, () => 'redo'), 'show r'].join('\n'));
    expect(result.stderr).toBe('');
    expect(result.stdout.match(/rect#r moved by \(1,2\)/g)).toHaveLength(60);
    expect(result.stdout.match(/undone: move r by \(1,2\)/g)).toHaveLength(30);
    expect(result.stdout).toContain('rect#r  parent=svg\n  x=0 y=0 width=1 height=1');
    expect(result.stdout).toContain('rect#r  parent=svg\n  x=30 y=60 width=1 height=1');
  });
});
