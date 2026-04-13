import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { buildShellWrapper, SHELL_WRAPPER_START, SHELL_WRAPPER_END } from './wrapper';

export function installShellWrapper(rcPath: string): void {
  const existing = existsSync(rcPath) ? readFileSync(rcPath, 'utf8') : '';
  if (existing.includes(SHELL_WRAPPER_START)) {
    return; // idempotent
  }
  const needsNewline = existing.length > 0 && !existing.endsWith('\n');
  const next = existing + (needsNewline ? '\n' : '') + buildShellWrapper();
  writeFileSync(rcPath, next, 'utf8');
}

export function uninstallShellWrapper(rcPath: string): void {
  if (!existsSync(rcPath)) return;
  const existing = readFileSync(rcPath, 'utf8');
  const startIdx = existing.indexOf(SHELL_WRAPPER_START);
  if (startIdx < 0) return;
  const endIdx = existing.indexOf(SHELL_WRAPPER_END, startIdx);
  if (endIdx < 0) return;
  const afterEnd = endIdx + SHELL_WRAPPER_END.length;
  const trailingNewline = existing[afterEnd] === '\n' ? 1 : 0;
  const next = existing.slice(0, startIdx) + existing.slice(afterEnd + trailingNewline);
  writeFileSync(rcPath, next, 'utf8');
}
