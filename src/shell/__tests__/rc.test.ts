import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installShellWrapper, uninstallShellWrapper } from '../rc';

describe('installShellWrapper', () => {
  let dir: string;
  let rc: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cctint-rc-'));
    rc = join(dir, '.zshrc');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('creates the rc file when missing and appends the block', () => {
    installShellWrapper(rc);
    const content = readFileSync(rc, 'utf8');
    expect(content).toContain('>>> cctint shell integration >>>');
    expect(content).toContain('<<< cctint shell integration <<<');
  });

  test('appends block to existing rc while preserving contents', () => {
    writeFileSync(rc, 'export FOO=bar\n');
    installShellWrapper(rc);
    const content = readFileSync(rc, 'utf8');
    expect(content).toContain('export FOO=bar');
    expect(content).toContain('cctint shell integration');
  });

  test('is idempotent: re-install does not duplicate block', () => {
    installShellWrapper(rc);
    installShellWrapper(rc);
    const content = readFileSync(rc, 'utf8');
    const matches = content.match(/>>> cctint shell integration >>>/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe('uninstallShellWrapper', () => {
  let dir: string;
  let rc: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cctint-rc-'));
    rc = join(dir, '.zshrc');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('removes the guarded block and preserves the rest', () => {
    writeFileSync(rc, 'export FOO=bar\n');
    installShellWrapper(rc);
    uninstallShellWrapper(rc);
    const content = readFileSync(rc, 'utf8');
    expect(content).toContain('export FOO=bar');
    expect(content).not.toContain('cctint shell integration');
  });

  test('no-ops when rc file does not exist', () => {
    expect(() => uninstallShellWrapper(rc)).not.toThrow();
    expect(existsSync(rc)).toBe(false);
  });

  test('no-ops when rc file has no cctint block', () => {
    writeFileSync(rc, 'export FOO=bar\n');
    uninstallShellWrapper(rc);
    expect(readFileSync(rc, 'utf8')).toBe('export FOO=bar\n');
  });
});
