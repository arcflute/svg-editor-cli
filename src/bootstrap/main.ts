import { stdin, stdout, stderr } from 'node:process';
import { CliShell } from '../cli/CliShell.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { CommandDispatcher } from '../application/CommandDispatcher.js';
import { EditorSession } from '../application/EditorSession.js';
import { FileDocumentStore } from '../infrastructure/FileDocumentStore.js';
import { XmlSvgCodec } from '../infrastructure/XmlSvgCodec.js';

const factory = new ShapeFactory();
const dispatcher = new CommandDispatcher(new EditorSession(factory, new FileDocumentStore(), new XmlSvgCodec(factory)), factory);
const shell = new CliShell(stdin, stdout, stderr, dispatcher, Boolean(stdin.isTTY && stdout.isTTY));

try {
  await shell.run();
} catch {
  stderr.write('error: CLI input/output failure\n');
  process.exitCode = 1;
}
