import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInstallCommand } from '../install';
import { runUninstallCommand } from '../uninstall';
import { runResetCommand } from '../reset';

describe('runInstallCommand', () => {
  let home: string;
  let cwd: string;
  let stderr: string[];
  let stdout: string[];

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'cctint-install-home-'));
    cwd = mkdtempSync(join(tmpdir(), 'cctint-install-cwd-'));
    stderr = [];
    stdout = [];
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  test('install fails when existing global settings.json is corrupt', async () => {
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(join(home, '.claude', 'settings.json'), '{ broken');
    const code = await runInstallCommand({
      argv: ['install', '--no-shell'],
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd,
      writeStdout: (s) => stdout.push(s),
      writeStderr: (s) => stderr.push(s),
      binPath: 'cctint',
    });
    expect(code).toBe(1);
    expect(stderr.join('')).toMatch(/refusing to modify/);
    expect(readFileSync(join(home, '.claude', 'settings.json'), 'utf8')).toBe('{ broken');
  });

  test('global install writes to home settings.json and skips shell wrapper when --no-shell', async () => {
    const code = await runInstallCommand({
      argv: ['install', '--no-shell'],
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd,
      writeStdout: (s) => stdout.push(s),
      writeStderr: (s) => stderr.push(s),
      binPath: 'cctint',
    });
    expect(code).toBe(0);
    const settings = JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('cctint hook SessionStart');
    expect(existsSync(join(home, '.zshrc'))).toBe(false);
  });

  test('project install writes to cwd .claude/settings.json', async () => {
    const code = await runInstallCommand({
      argv: ['install', '--scope', 'project', '--no-shell'],
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd,
      writeStdout: (s) => stdout.push(s),
      writeStderr: (s) => stderr.push(s),
      binPath: 'cctint',
    });
    expect(code).toBe(0);
    const settings = JSON.parse(readFileSync(join(cwd, '.claude', 'settings.json'), 'utf8'));
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('cctint hook SessionStart');
  });

  test('without --no-shell, appends block to ~/.zshrc when it exists', async () => {
    writeFileSync(join(home, '.zshrc'), 'export FOO=bar\n');
    await runInstallCommand({
      argv: ['install'],
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd,
      writeStdout: (s) => stdout.push(s),
      writeStderr: (s) => stderr.push(s),
      binPath: 'cctint',
    });
    const rc = readFileSync(join(home, '.zshrc'), 'utf8');
    expect(rc).toContain('cctint shell integration');
  });

  test('is idempotent: two installs yield one set of entries', async () => {
    await runInstallCommand({
      argv: ['install', '--no-shell'],
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd,
      writeStdout: () => {},
      writeStderr: () => {},
      binPath: 'cctint',
    });
    await runInstallCommand({
      argv: ['install', '--no-shell'],
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd,
      writeStdout: () => {},
      writeStderr: () => {},
      binPath: 'cctint',
    });
    const settings = JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
    const cctintEntries = settings.hooks.PreToolUse.filter(
      (h: { hooks?: Array<{ command: string }> }) =>
        h.hooks?.some((cmd) => cmd.command.startsWith('cctint')),
    );
    expect(cctintEntries).toHaveLength(1);
  });

  test('warns (does not fail) when TERM_PROGRAM is not iTerm.app', async () => {
    const code = await runInstallCommand({
      argv: ['install', '--no-shell'],
      env: { HOME: home, TERM_PROGRAM: 'Terminal.app' },
      cwd,
      writeStdout: (s) => stdout.push(s),
      writeStderr: (s) => stderr.push(s),
      binPath: 'cctint',
    });
    expect(code).toBe(0);
    expect(stderr.join('')).toMatch(/iTerm/i);
  });
});

describe('runUninstallCommand', () => {
  let home: string;
  let cwd: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'cctint-uninstall-home-'));
    cwd = mkdtempSync(join(tmpdir(), 'cctint-uninstall-cwd-'));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  test('reverses a prior install cleanly', async () => {
    writeFileSync(join(home, '.zshrc'), 'export FOO=bar\n');
    await runInstallCommand({
      argv: ['install'],
      env: { HOME: home, TERM_PROGRAM: 'iTerm.app' },
      cwd,
      writeStdout: () => {},
      writeStderr: () => {},
      binPath: 'cctint',
    });
    const code = await runUninstallCommand({
      argv: ['uninstall'],
      env: { HOME: home },
      cwd,
      writeStdout: () => {},
      writeStderr: () => {},
    });
    expect(code).toBe(0);
    const settingsPath = join(home, '.claude', 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(settings.hooks).toBeUndefined();
    const rc = readFileSync(join(home, '.zshrc'), 'utf8');
    expect(rc).not.toContain('cctint shell integration');
    expect(rc).toContain('export FOO=bar');
  });
});

describe('runResetCommand', () => {
  let home: string;
  let cwd: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'cctint-reset-'));
    cwd = mkdtempSync(join(tmpdir(), 'cctint-reset-cwd-'));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  test('emits SetColors=bg=default to stderr in live-color mode', async () => {
    const stderr: string[] = [];
    const code = await runResetCommand({
      argv: ['reset'],
      env: { HOME: home },
      cwd,
      writeStdout: () => {},
      writeStderr: (s) => stderr.push(s),
    });
    expect(code).toBe(0);
    expect(stderr.join('')).toBe('\x1b]1337;SetColors=bg=default\x07\x1b]111\x07');
  });

  test('emits SetProfile=<default> in profile-switch mode', async () => {
    const cfgDir = join(home, '.config', 'cctint');
    mkdirSync(cfgDir, { recursive: true });
    writeFileSync(
      join(cfgDir, 'config.json'),
      JSON.stringify({
        mode: 'profile-switch',
        profiles: {
          default: 'Default',
          idle: 'CC-Idle',
          running: 'CC-Running',
          waiting: 'CC-Waiting',
          error: 'CC-Error',
        },
      }),
    );
    const stderr: string[] = [];
    const code = await runResetCommand({
      argv: ['reset'],
      env: { HOME: home },
      cwd,
      writeStdout: () => {},
      writeStderr: (s) => stderr.push(s),
    });
    expect(code).toBe(0);
    expect(stderr.join('')).toBe('\x1b]1337;SetProfile=Default\x07');
  });
});
