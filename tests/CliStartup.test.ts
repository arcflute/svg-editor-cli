import { spawnSync } from 'node:child_process';
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

  it('reads multiple lines and an unterminated final line without claiming success', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/bootstrap/main.ts'], {
      cwd: projectRoot,
      input: '\r\ninit 800 600\r\nhelp',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stderr.trim().split(/\r?\n/)).toEqual([
      'error: command not implemented in this scaffold',
      'error: command not implemented in this scaffold',
    ]);
    expect(result.stdout.match(/svg> /g)).toHaveLength(4);
    expect(result.stdout).not.toContain('created');
  });
});
