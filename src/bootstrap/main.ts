import { stdin, stdout, stderr } from 'node:process';
import { CliShell } from '../cli/CliShell.js';

const shell = new CliShell(stdin, stdout, stderr, Boolean(stdin.isTTY && stdout.isTTY));

try {
  await shell.run();
} catch {
  stderr.write('error: CLI input/output failure\n');
  process.exitCode = 1;
}
