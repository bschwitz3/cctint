import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mainAsync, type CliIO } from '../cli';

describe('cli dispatch', () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'cctint-cli-'));
  });

  afterEach(() => rmSync(home, { recursive: true, force: true }));

  function io(overrides: Partial<CliIO> = {}): CliIO {
    return {
      argv: [],
      stdin: '',
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd: home,
      writeStdout: () => {},
      writeStderr: () => {},
      ...overrides,
    };
  }

  test('no args prints usage and returns 0', async () => {
    const out: string[] = [];
    const code = await mainAsync(io({ argv: ['node', 'cctint'], writeStderr: (s) => out.push(s) }));
    expect(code).toBe(0);
    expect(out.join('')).toMatch(/usage/i);
  });

  test('unknown command returns 1', async () => {
    const code = await mainAsync(io({ argv: ['node', 'cctint', 'whatnow'] }));
    expect(code).toBe(1);
  });

  test('hook command dispatches to hook runner', async () => {
    const out: string[] = [];
    const code = await mainAsync(
      io({
        argv: ['node', 'cctint', 'hook', 'SessionStart'],
        stdin: '{"session_id":"abc"}',
        writeStderr: (s) => out.push(s),
      }),
    );
    expect(code).toBe(0);
    expect(out.join('')).toContain('\x1b]1337;SetColors=bg=');
  });

  test('reset command dispatches to reset runner', async () => {
    const out: string[] = [];
    const code = await mainAsync(
      io({ argv: ['node', 'cctint', 'reset'], writeStderr: (s) => out.push(s) }),
    );
    expect(code).toBe(0);
    expect(out.join('')).toBe('\x1b]1337;SetColors=bg=default\x07\x1b]111\x07');
  });

  test('install command dispatches to install runner', async () => {
    const code = await mainAsync(io({ argv: ['node', 'cctint', 'install', '--no-shell'] }));
    expect(code).toBe(0);
  });

  test('uninstall command dispatches to uninstall runner', async () => {
    const code = await mainAsync(io({ argv: ['node', 'cctint', 'uninstall'] }));
    expect(code).toBe(0);
  });
});
