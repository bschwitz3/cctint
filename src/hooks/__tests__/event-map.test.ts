import { describe, expect, test } from 'vitest';
import { hookToEvent } from '../event-map';
import type { HookPayload } from '../parser';

const p = (overrides: Partial<HookPayload> = {}): HookPayload => ({
  sessionId: 's',
  toolFailed: false,
  userDenied: false,
  raw: {},
  ...overrides,
});

describe('hookToEvent', () => {
  test('SessionStart → SessionStart', () => {
    expect(hookToEvent('SessionStart', p())).toBe('SessionStart');
  });

  test('SessionEnd → SessionEnd', () => {
    expect(hookToEvent('SessionEnd', p())).toBe('SessionEnd');
  });

  test('UserPromptSubmit → UserPromptSubmit', () => {
    expect(hookToEvent('UserPromptSubmit', p())).toBe('UserPromptSubmit');
  });

  test('PreToolUse → ToolStarting', () => {
    expect(hookToEvent('PreToolUse', p())).toBe('ToolStarting');
  });

  test('PostToolUse with toolFailed:true → ToolFailed', () => {
    expect(hookToEvent('PostToolUse', p({ toolFailed: true }))).toBe('ToolFailed');
  });

  test('PostToolUse with toolFailed:false → ToolStarting (Claude still working)', () => {
    expect(hookToEvent('PostToolUse', p({ toolFailed: false }))).toBe('ToolStarting');
  });

  test('Notification without userDenied → WaitingForUser', () => {
    expect(hookToEvent('Notification', p())).toBe('WaitingForUser');
  });

  test('Notification with userDenied → UserDenied', () => {
    expect(hookToEvent('Notification', p({ userDenied: true }))).toBe('UserDenied');
  });

  test('Stop → Stop', () => {
    expect(hookToEvent('Stop', p())).toBe('Stop');
  });

  test('unknown hook name → undefined', () => {
    expect(hookToEvent('UnknownHook', p())).toBeUndefined();
  });
});
