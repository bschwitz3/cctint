import { describe, expect, test } from 'vitest';
import { iterm2Backend } from '../iterm2';
import { DEFAULT_CONFIG, type Config } from '../../config/defaults';

describe('iterm2Backend', () => {
  test('encodeState in live-color mode emits SetColors for each state', () => {
    for (const state of ['idle', 'running', 'waiting', 'error'] as const) {
      const expectedHex = DEFAULT_CONFIG.colors[state].bg.slice(1).toLowerCase();
      expect(iterm2Backend.encodeState(state, DEFAULT_CONFIG)).toBe(
        `\x1b]1337;SetColors=bg=${expectedHex}\x07`,
      );
    }
  });

  test('encodeReset in live-color mode emits SetColors=default + OSC 111', () => {
    expect(iterm2Backend.encodeReset(DEFAULT_CONFIG)).toBe(
      '\x1b]1337;SetColors=bg=default\x07\x1b]111\x07',
    );
  });

  test('encodeState in profile-switch mode emits SetProfile', () => {
    const cfg: Config = {
      ...DEFAULT_CONFIG,
      mode: 'profile-switch',
      profiles: { ...DEFAULT_CONFIG.profiles, default: 'Default' },
    } as unknown as Config;
    expect(iterm2Backend.encodeState('idle', cfg)).toBe('\x1b]1337;SetProfile=CC-Idle\x07');
    expect(iterm2Backend.encodeState('running', cfg)).toBe('\x1b]1337;SetProfile=CC-Running\x07');
  });

  test('encodeReset in profile-switch mode emits SetProfile for default', () => {
    const cfg: Config = {
      ...DEFAULT_CONFIG,
      mode: 'profile-switch',
      profiles: { ...DEFAULT_CONFIG.profiles, default: 'MyDefault' },
    } as unknown as Config;
    expect(iterm2Backend.encodeReset(cfg)).toBe('\x1b]1337;SetProfile=MyDefault\x07');
  });
});
