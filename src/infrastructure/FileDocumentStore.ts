import { openSync, closeSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DocumentStore } from '../application/DocumentStore.js';

export class FileDocumentStore implements DocumentStore {
  public resolve(path: string): string { return resolve(path); }
  public read(path: string): string {
    return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
  }
  public writeAtomic(path: string, contents: string): void {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    let created = false;
    try {
      descriptor = openSync(temporary, 'wx');
      created = true;
      writeFileSync(descriptor, contents, 'utf8');
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, path);
      created = false;
    } finally {
      if (descriptor !== undefined) { try { closeSync(descriptor); } catch { /* retain original failure */ } }
      if (created) { try { unlinkSync(temporary); } catch { /* only this operation's temporary file */ } }
    }
  }
}
