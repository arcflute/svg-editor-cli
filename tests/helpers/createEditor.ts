import { CommandDispatcher } from '../../src/application/CommandDispatcher.js';
import { EditorSession } from '../../src/application/EditorSession.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

export function createEditor() {
  const factory = new ShapeFactory();
  const session = new EditorSession(factory);
  const dispatcher = new CommandDispatcher(session, factory);
  const tokenizer = new Tokenizer();
  return { session, run: (line: string) => dispatcher.execute(tokenizer.tokenize(line)) };
}
