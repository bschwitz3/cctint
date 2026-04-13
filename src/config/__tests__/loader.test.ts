import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../loader';
import { DEFAULT_CONFIG } from '../defaults';

describe('loadConfig', () => {
  let root: string;
  let globalPath: string;
  let projectPath: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cctint-cfg-'));
    const cfgDir = join(root, '.config', 'cctint');
    mkdirSync(cfgDir, { recursive: true });
    globalPath = join(cfgDir, 'config.json');
    projectPath = join(root, '.cctint.json');
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test('returns defaults when no files exist', () => {
    const cfg = loadConfig({ globalPath, projectPath });
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });

  test('reads global config', () => {
    writeFileSync(globalPath, JSON.stringify({ colors: { idle: { bg: '#001100' } } }));
    const cfg = loadConfig({ globalPath, projectPath });
    expect(cfg.colors.idle.bg).toBe('#001100');
  });

  test('project overlay takes precedence over global', () => {
    writeFileSync(globalPath, JSON.stringify({ colors: { idle: { bg: '#001100' } } }));
    writeFileSync(projectPath, JSON.stringify({ colors: { idle: { bg: '#220022' } } }));
    const cfg = loadConfig({ globalPath, projectPath });
    expect(cfg.colors.idle.bg).toBe('#220022');
  });

  test('project overlay leaves un-overridden keys as global/default', () => {
    writeFileSync(globalPath, JSON.stringify({ colors: { idle: { bg: '#001100' }, running: { bg: '#aa0000' } } }));
    writeFileSync(projectPath, JSON.stringify({ colors: { idle: { bg: '#220022' } } }));
    const cfg = loadConfig({ globalPath, projectPath });
    expect(cfg.colors.idle.bg).toBe('#220022');
    expect(cfg.colors.running.bg).toBe('#aa0000');
  });

  test('corrupt global config throws when strict=true', () => {
    writeFileSync(globalPath, '{not json');
    expect(() => loadConfig({ globalPath, projectPath, strict: true })).toThrow();
  });

  test('corrupt global config falls back to defaults when strict=false', () => {
    writeFileSync(globalPath, '{not json');
    const cfg = loadConfig({ globalPath, projectPath, strict: false });
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });
});
