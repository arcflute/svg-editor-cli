import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { Tokenizer } from './Tokenizer.js';
import type { CommandDispatcher } from '../application/CommandDispatcher.js';

/** Transport and lexical adapter; all business dispatch goes through application. */
export class CliShell {
  public constructor(
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly errorOutput: Writable,
    private readonly dispatcher: CommandDispatcher,
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

    const tokenizer = new Tokenizer();
    this.output.write("svg-editor 0.1 — type 'help' for commands\n");
    lines.prompt();

    try {
      for await (const line of lines) {
        let output: readonly string[];
        try {
          output = this.dispatcher.execute(tokenizer.tokenize(line));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'command failed';
          this.errorOutput.write(`error: ${message.replace(/[\r\n\u2028\u2029]/gu, ' ')}\n`);
          lines.prompt();
          continue;
        }
        if (output.length > 0) this.output.write(`${output.join('\n')}\n`);
        lines.prompt();
      }
    } finally {
      lines.close();
      this.output.write('\n');
    }
  }
}
