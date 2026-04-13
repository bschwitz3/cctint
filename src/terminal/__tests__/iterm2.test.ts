import { describe, expect, test } from 'vitest';
import { iterm2 } from '../iterm2';

describe('iterm2 escape codes', () => {
  test('setBackground emits iTerm2 SetColors OSC with 6-digit hex (no #)', () => {
    expect(iterm2.setBackground('#1f3a1f')).toBe('\x1b]1337;SetColors=bg=1f3a1f\x07');
  });

  test('setBackground normalizes hex to lowercase and strips #', () => {
    expect(iterm2.setBackground('#AABBCC')).toBe('\x1b]1337;SetColors=bg=aabbcc\x07');
  });

  test('setBackground rejects invalid hex', () => {
    expect(() => iterm2.setBackground('not-a-hex')).toThrow();
  });

  test('resetBackground emits iTerm2 SetColors=default followed by OSC 111 standard reset', () => {
    expect(iterm2.resetBackground()).toBe('\x1b]1337;SetColors=bg=default\x07\x1b]111\x07');
  });

  test('switchProfile emits SetProfile OSC', () => {
    expect(iterm2.switchProfile('CC-Idle')).toBe('\x1b]1337;SetProfile=CC-Idle\x07');
  });

  test('switchProfile rejects names containing the BEL terminator', () => {
    expect(() => iterm2.switchProfile('bad\x07name')).toThrow();
  });

  test('switchProfile rejects empty names', () => {
    expect(() => iterm2.switchProfile('')).toThrow();
  });
});
