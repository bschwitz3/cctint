import { describe, expect, test } from 'vitest';
import {
  STATES,
  EVENTS,
  ERROR_PRIORITY,
  type State,
  type Event,
  type ErrorKind,
} from '../types';

describe('state/event types', () => {
  test('STATES contains all four states', () => {
    expect([...STATES].sort()).toEqual(['error', 'idle', 'running', 'waiting']);
  });

  test('EVENTS contains all hook-derived events', () => {
    expect([...EVENTS].sort()).toEqual([
      'SessionEnd',
      'SessionStart',
      'Stop',
      'ToolFailed',
      'ToolStarting',
      'UserDenied',
      'UserPromptSubmit',
      'WaitingForUser',
    ]);
  });

  test('ERROR_PRIORITY reflects session-died > user-denied > tool-failure', () => {
    expect(ERROR_PRIORITY['session-died']).toBeGreaterThan(ERROR_PRIORITY['user-denied']);
    expect(ERROR_PRIORITY['user-denied']).toBeGreaterThan(ERROR_PRIORITY['tool-failure']);
  });

  test('State and Event types exist as discriminated values', () => {
    const s: State = 'idle';
    const e: Event = 'Stop';
    const k: ErrorKind = 'tool-failure';
    expect(s).toBe('idle');
    expect(e).toBe('Stop');
    expect(k).toBe('tool-failure');
  });
});
