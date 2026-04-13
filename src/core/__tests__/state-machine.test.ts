import { describe, expect, test } from 'vitest';
import { transition, type TransitionInput } from '../state-machine';
import type { StateSnapshot } from '../types';

const baseSnap = (overrides: Partial<StateSnapshot> = {}): StateSnapshot => ({
  state: 'idle',
  enteredAtMs: 0,
  ...overrides,
});

describe('transition', () => {
  test('SessionStart always goes to idle (invariant: fresh session is green)', () => {
    const cases: StateSnapshot[] = [
      baseSnap({ state: 'idle' }),
      baseSnap({ state: 'running' }),
      baseSnap({ state: 'waiting' }),
      baseSnap({ state: 'error', errorKind: 'session-died' }),
    ];
    for (const current of cases) {
      const input: TransitionInput = { current, event: 'SessionStart', nowMs: 1000, debounceErrorFlashMs: 1500 };
      const next = transition(input);
      expect(next.state).toBe('idle');
      expect(next.errorKind).toBeUndefined();
    }
  });

  test('UserPromptSubmit transitions to running', () => {
    const next = transition({
      current: baseSnap({ state: 'idle' }),
      event: 'UserPromptSubmit',
      nowMs: 1000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('running');
  });

  test('ToolStarting stays running when already running', () => {
    const current = baseSnap({ state: 'running', enteredAtMs: 500 });
    const next = transition({ current, event: 'ToolStarting', nowMs: 1000, debounceErrorFlashMs: 1500 });
    expect(next.state).toBe('running');
    expect(next.enteredAtMs).toBe(500);
  });

  test('ToolFailed transitions to error (tool-failure)', () => {
    const next = transition({
      current: baseSnap({ state: 'running' }),
      event: 'ToolFailed',
      nowMs: 1000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('error');
    expect(next.errorKind).toBe('tool-failure');
  });

  test('UserDenied transitions to error (user-denied)', () => {
    const next = transition({
      current: baseSnap({ state: 'waiting' }),
      event: 'UserDenied',
      nowMs: 1000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('error');
    expect(next.errorKind).toBe('user-denied');
  });

  test('WaitingForUser transitions to waiting', () => {
    const next = transition({
      current: baseSnap({ state: 'running' }),
      event: 'WaitingForUser',
      nowMs: 1000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('waiting');
  });

  test('Stop transitions to idle', () => {
    const next = transition({
      current: baseSnap({ state: 'running' }),
      event: 'Stop',
      nowMs: 1000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('idle');
  });

  test('debounce: running cannot override tool-failure error within errorFlashMs window', () => {
    const current = baseSnap({ state: 'error', errorKind: 'tool-failure', enteredAtMs: 1000 });
    const next = transition({
      current,
      event: 'ToolStarting',
      nowMs: 1500,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('error');
    expect(next.errorKind).toBe('tool-failure');
  });

  test('debounce: running can override tool-failure after errorFlashMs window', () => {
    const current = baseSnap({ state: 'error', errorKind: 'tool-failure', enteredAtMs: 1000 });
    const next = transition({
      current,
      event: 'ToolStarting',
      nowMs: 1000 + 1501,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('running');
    expect(next.errorKind).toBeUndefined();
  });

  test('priority: higher-priority error always wins, even within debounce window', () => {
    const current = baseSnap({ state: 'error', errorKind: 'tool-failure', enteredAtMs: 1000 });
    const next = transition({
      current,
      event: 'UserDenied',
      nowMs: 1100,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('error');
    expect(next.errorKind).toBe('user-denied');
  });

  test('priority: lower-priority error cannot override higher within debounce', () => {
    const current = baseSnap({ state: 'error', errorKind: 'user-denied', enteredAtMs: 1000 });
    const next = transition({
      current,
      event: 'ToolFailed',
      nowMs: 1100,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('error');
    expect(next.errorKind).toBe('user-denied');
  });

  test('SessionEnd is a terminal signal handled by caller, not state machine', () => {
    const current = baseSnap({ state: 'running', enteredAtMs: 500 });
    const next = transition({
      current,
      event: 'SessionEnd',
      nowMs: 1000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.state).toBe('running');
    expect(next.enteredAtMs).toBe(500);
  });

  test('enteredAtMs is updated on state change', () => {
    const current = baseSnap({ state: 'idle', enteredAtMs: 100 });
    const next = transition({
      current,
      event: 'UserPromptSubmit',
      nowMs: 2000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.enteredAtMs).toBe(2000);
  });

  test('enteredAtMs preserved when state does not change', () => {
    const current = baseSnap({ state: 'running', enteredAtMs: 100 });
    const next = transition({
      current,
      event: 'ToolStarting',
      nowMs: 2000,
      debounceErrorFlashMs: 1500,
    });
    expect(next.enteredAtMs).toBe(100);
  });
});
