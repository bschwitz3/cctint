import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerHooks, unregisterHooks, HOOK_COMMAND_MARKER } from '../registration';

// Claude Code hook format helpers
const makeGroupEntry = (command: string) => ({
  matcher: '',
  hooks: [{ type: 'command', command }],
});

describe('registerHooks', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cctint-reg-'));
    file = join(dir, 'settings.json');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('creates settings.json with cctint hook entries when none exists', () => {
    registerHooks(file, { binPath: 'cctint' });
    const content = JSON.parse(readFileSync(file, 'utf8'));
    expect(content.hooks.SessionStart).toEqual([makeGroupEntry('cctint hook SessionStart')]);
    expect(Object.keys(content.hooks).sort()).toEqual([
      'Notification',
      'PostToolUse',
      'PreToolUse',
      'SessionEnd',
      'SessionStart',
      'Stop',
      'UserPromptSubmit',
    ]);
  });

  test('preserves unrelated hook entries in group format', () => {
    writeFileSync(
      file,
      JSON.stringify({
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'other --arg' }] }],
        },
      }),
    );
    registerHooks(file, { binPath: 'cctint' });
    const content = JSON.parse(readFileSync(file, 'utf8'));
    const pre = content.hooks.PreToolUse as Array<{ matcher: string; hooks: Array<{ command: string }> }>;
    expect(pre).toHaveLength(2);
    expect(pre[0]).toEqual({ matcher: 'Bash', hooks: [{ type: 'command', command: 'other --arg' }] });
    expect(pre[1]).toEqual(makeGroupEntry('cctint hook PreToolUse'));
  });

  test('is idempotent (re-register does not duplicate)', () => {
    registerHooks(file, { binPath: 'cctint' });
    registerHooks(file, { binPath: 'cctint' });
    const content = JSON.parse(readFileSync(file, 'utf8'));
    const pre = content.hooks.PreToolUse as Array<{ hooks: Array<{ command: string }> }>;
    const cctintEntries = pre.filter((entry) =>
      entry.hooks?.some((h) => h.command.includes(HOOK_COMMAND_MARKER)),
    );
    expect(cctintEntries).toHaveLength(1);
  });

  test('preserves non-hooks settings (e.g. permissions)', () => {
    writeFileSync(file, JSON.stringify({ permissions: { allow: ['Bash'] } }));
    registerHooks(file, { binPath: 'cctint' });
    const content = JSON.parse(readFileSync(file, 'utf8'));
    expect(content.permissions).toEqual({ allow: ['Bash'] });
  });

  test('honors custom bin path', () => {
    registerHooks(file, { binPath: '/opt/bin/cctint' });
    const content = JSON.parse(readFileSync(file, 'utf8'));
    expect(content.hooks.SessionStart[0]).toEqual(
      makeGroupEntry('/opt/bin/cctint hook SessionStart'),
    );
  });

  test('refuses to run when existing settings.json is invalid JSON', () => {
    writeFileSync(file, '{ not json');
    expect(() => registerHooks(file, { binPath: 'cctint' })).toThrow(/refusing to modify/);
  });

  test('refuses to run when existing settings root is a JSON array', () => {
    writeFileSync(file, JSON.stringify([1, 2]));
    expect(() => registerHooks(file, { binPath: 'cctint' })).toThrow(/refusing to modify/);
  });

  test('removes legacy flat-format cctint entries and replaces with group format', () => {
    // Simulate a settings.json written by the old (buggy) version of cctint
    writeFileSync(
      file,
      JSON.stringify({
        hooks: {
          SessionStart: [{ type: 'command', command: 'cctint hook SessionStart' }],
        },
      }),
    );
    registerHooks(file, { binPath: 'cctint' });
    const content = JSON.parse(readFileSync(file, 'utf8'));
    // Should have exactly one entry in the new group format
    expect(content.hooks.SessionStart).toEqual([makeGroupEntry('cctint hook SessionStart')]);
  });
});

describe('unregisterHooks', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cctint-unreg-'));
    file = join(dir, 'settings.json');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('removes cctint group-format entries while preserving others', () => {
    writeFileSync(
      file,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', hooks: [{ type: 'command', command: 'other --arg' }] },
            makeGroupEntry('cctint hook PreToolUse'),
          ],
        },
      }),
    );
    unregisterHooks(file);
    const content = JSON.parse(readFileSync(file, 'utf8'));
    expect(content.hooks.PreToolUse).toEqual([
      { matcher: 'Bash', hooks: [{ type: 'command', command: 'other --arg' }] },
    ]);
  });

  test('removes legacy flat-format cctint entries', () => {
    writeFileSync(
      file,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', hooks: [{ type: 'command', command: 'other --arg' }] },
            { type: 'command', command: 'cctint hook PreToolUse' },
          ],
        },
      }),
    );
    unregisterHooks(file);
    const content = JSON.parse(readFileSync(file, 'utf8'));
    expect(content.hooks.PreToolUse).toEqual([
      { matcher: 'Bash', hooks: [{ type: 'command', command: 'other --arg' }] },
    ]);
  });

  test('removes the hook key when the last cctint entry was its only entry', () => {
    writeFileSync(
      file,
      JSON.stringify({
        hooks: { PreToolUse: [makeGroupEntry('cctint hook PreToolUse')] },
      }),
    );
    unregisterHooks(file);
    const content = JSON.parse(readFileSync(file, 'utf8'));
    expect(content.hooks?.PreToolUse).toBeUndefined();
  });

  test('removes the hooks key entirely when empty', () => {
    writeFileSync(
      file,
      JSON.stringify({
        hooks: { PreToolUse: [makeGroupEntry('cctint hook PreToolUse')] },
      }),
    );
    unregisterHooks(file);
    const content = JSON.parse(readFileSync(file, 'utf8'));
    expect(content.hooks).toBeUndefined();
  });

  test('no-ops when file does not exist', () => {
    expect(() => unregisterHooks(file)).not.toThrow();
    expect(existsSync(file)).toBe(false);
  });

  test('no-ops without overwriting when settings.json is invalid JSON', () => {
    const corrupt = '{ "hooks": ';
    writeFileSync(file, corrupt);
    unregisterHooks(file);
    expect(readFileSync(file, 'utf8')).toBe(corrupt);
  });
});
