import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

/** The initial REPL only handles transport; business commands arrive later. */
export class CliShell {
  public constructor(
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly errorOutput: Writable,
    private readonly terminal: boolean = false,
  ) {}

  public async run(): Promise<void> {
    const lines = createInterface({
      input: this.input,
      output: this.output,
      terminal: this.terminal,
      crlfDelay: Infinity,
      prompt: 'svg> ',
    });

    this.output.write('svg-editor 0.1 — CLI scaffold; commands are not implemented yet.\n');
    lines.prompt();

    try {
      for await (const line of lines) {
        if (line.trim().length > 0) {
          this.errorOutput.write('error: command not implemented in this scaffold\n');
        }
        lines.prompt();
      }
    } finally {
      lines.close();
      this.output.write('\n');
    }
  }
}
