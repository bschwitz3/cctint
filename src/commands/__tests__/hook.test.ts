import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runHookCommand } from '../hook';
import { DEFAULT_CONFIG } from '../../config/defaults';

describe('runHookCommand', () => {
  let dir: string;
  let paths: { globalConfig: string; projectConfig: string; stateDir: string; logFile: string };
  let stderrBuf: string[];
  let writeStderr: (s: string) => void;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cctint-hook-'));
    paths = {
      globalConfig: join(dir, 'config.json'),
      projectConfig: join(dir, 'project.json'),
      stateDir: join(dir, 'state'),
      logFile: join(dir, 'log', 'cctint.log'),
    };
    stderrBuf = [];
    writeStderr = (s) => stderrBuf.push(s);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('SessionStart emits green tint to stderr', async () => {
    const code = await runHookCommand({
      hookName: 'SessionStart',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    expect(code).toBe(0);
    const expected = `\x1b]1337;SetColors=bg=${DEFAULT_CONFIG.colors.idle.bg.slice(1)}\x07`;
    expect(stderrBuf.join('')).toBe(expected);
  });

  test('UserPromptSubmit emits yellow tint', async () => {
    await runHookCommand({
      hookName: 'UserPromptSubmit',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    const expected = `\x1b]1337;SetColors=bg=${DEFAULT_CONFIG.colors.running.bg.slice(1)}\x07`;
    expect(stderrBuf.join('')).toBe(expected);
  });

  test('SessionEnd emits reset (default bg)', async () => {
    await runHookCommand({
      hookName: 'SessionEnd',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    expect(stderrBuf.join('')).toBe('\x1b]1337;SetColors=bg=default\x07\x1b]111\x07');
  });

  test('never writes to stdout', async () => {
    const stdoutBuf: string[] = [];
    await runHookCommand({
      hookName: 'SessionStart',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: (s) => stdoutBuf.push(s),
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    expect(stdoutBuf.join('')).toBe('');
  });

  test('exits 0 even when stdin is garbage', async () => {
    const code = await runHookCommand({
      hookName: 'UserPromptSubmit',
      stdin: 'not json at all',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    expect(code).toBe(0);
  });

  test('no-ops when TERM_PROGRAM is not iTerm.app', async () => {
    const code = await runHookCommand({
      hookName: 'SessionStart',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'Terminal.app' },
      nowMs: 1000,
    });
    expect(code).toBe(0);
    expect(stderrBuf.join('')).toBe('');
  });

  test('no-ops when config.enabled is false', async () => {
    writeFileSync(paths.globalConfig, JSON.stringify({ enabled: false }));
    const code = await runHookCommand({
      hookName: 'SessionStart',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    expect(code).toBe(0);
    expect(stderrBuf.join('')).toBe('');
  });

  test('persists state snapshot across invocations', async () => {
    await runHookCommand({
      hookName: 'UserPromptSubmit',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    expect(existsSync(join(paths.stateDir, 'abc.json'))).toBe(true);
    const snap = JSON.parse(readFileSync(join(paths.stateDir, 'abc.json'), 'utf8'));
    expect(snap.state).toBe('running');
  });

  test('PostToolUse with successful tool keeps running state (no re-emit when already running)', async () => {
    await runHookCommand({
      hookName: 'UserPromptSubmit',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    stderrBuf.length = 0;
    await runHookCommand({
      hookName: 'PostToolUse',
      stdin: '{"session_id":"abc","tool_response":{"success":true}}',
      paths,
      writeStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 2000,
    });
    expect(stderrBuf.join('')).toBe('');
  });

  test('swallows internal errors and still exits 0', async () => {
    const throwingStderr = () => {
      throw new Error('boom');
    };
    const code = await runHookCommand({
      hookName: 'SessionStart',
      stdin: '{"session_id":"abc"}',
      paths,
      writeStderr: throwingStderr,
      writeStdout: () => {},
      env: { TERM_PROGRAM: 'iTerm.app' },
      nowMs: 1000,
    });
    expect(code).toBe(0);
  });
});
