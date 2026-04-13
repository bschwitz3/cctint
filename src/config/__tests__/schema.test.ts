import { describe, expect, test } from 'vitest';
import { parseConfig } from '../schema';
import { DEFAULT_CONFIG } from '../defaults';

describe('config schema', () => {
  test('empty object yields full defaults', () => {
    const cfg = parseConfig({});
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });

  test('partial override merges with defaults', () => {
    const cfg = parseConfig({ colors: { idle: { bg: '#112233' } } });
    expect(cfg.colors.idle.bg).toBe('#112233');
    expect(cfg.colors.running.bg).toBe(DEFAULT_CONFIG.colors.running.bg);
  });

  test('invalid hex color is rejected', () => {
    expect(() => parseConfig({ colors: { idle: { bg: 'not-a-hex' } } })).toThrow(/bg/);
  });

  test('missing # prefix is rejected', () => {
    expect(() => parseConfig({ colors: { idle: { bg: '112233' } } })).toThrow();
  });

  test('mode must be live-color or profile-switch', () => {
    expect(() => parseConfig({ mode: 'weird' })).toThrow(/mode/);
  });

  test('profile-switch mode requires profiles.default', () => {
    expect(() => parseConfig({ mode: 'profile-switch' })).toThrow(/profiles\.default/);
  });

  test('profile-switch mode with profiles.default succeeds', () => {
    const cfg = parseConfig({
      mode: 'profile-switch',
      profiles: { default: 'Default', idle: 'CC-Idle', running: 'CC-Running', waiting: 'CC-Waiting', error: 'CC-Error' },
    });
    expect(cfg.mode).toBe('profile-switch');
    expect(cfg.profiles.default).toBe('Default');
  });

  test('enabled defaults to true', () => {
    const cfg = parseConfig({});
    expect(cfg.enabled).toBe(true);
  });

  test('enabled=false is honored', () => {
    const cfg = parseConfig({ enabled: false });
    expect(cfg.enabled).toBe(false);
  });

  test('debounce.errorFlashMs defaults to 1500', () => {
    const cfg = parseConfig({});
    expect(cfg.debounce.errorFlashMs).toBe(1500);
  });

  test('logLevel defaults to warn', () => {
    expect(parseConfig({}).logLevel).toBe('warn');
  });

  test('overlay merges shallow-deep: color key override only replaces that key', () => {
    const cfg = parseConfig({ colors: { running: { bg: '#aabbcc' } } });
    expect(cfg.colors.running.bg).toBe('#aabbcc');
    expect(cfg.colors.idle.bg).toBe(DEFAULT_CONFIG.colors.idle.bg);
    expect(cfg.colors.waiting.bg).toBe(DEFAULT_CONFIG.colors.waiting.bg);
    expect(cfg.colors.error.bg).toBe(DEFAULT_CONFIG.colors.error.bg);
  });
});
