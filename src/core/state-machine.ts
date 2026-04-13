import { ERROR_PRIORITY, type ErrorKind, type Event, type StateSnapshot } from './types';

export interface TransitionInput {
  current: StateSnapshot;
  event: Event;
  nowMs: number;
  debounceErrorFlashMs: number;
}

export function transition(input: TransitionInput): StateSnapshot {
  const { current, event, nowMs, debounceErrorFlashMs } = input;

  // SessionStart: invariant — always goes to idle, clearing any error.
  if (event === 'SessionStart') {
    if (current.state === 'idle' && current.errorKind === undefined) {
      return current;
    }
    return { state: 'idle', enteredAtMs: nowMs };
  }

  // SessionEnd: handled by the caller (triggers terminal reset). State unchanged.
  if (event === 'SessionEnd') {
    return current;
  }

  // Error events: determine kind, then apply priority + debounce.
  const errorKind = errorKindForEvent(event);
  if (errorKind !== undefined) {
    if (current.state === 'error' && current.errorKind !== undefined) {
      const currentPriority = ERROR_PRIORITY[current.errorKind];
      const newPriority = ERROR_PRIORITY[errorKind];
      if (newPriority <= currentPriority) {
        return current;
      }
    }
    return { state: 'error', errorKind, enteredAtMs: nowMs };
  }

  // Non-error events: respect debounce on a live error.
  if (current.state === 'error' && current.errorKind !== undefined) {
    const elapsed = nowMs - current.enteredAtMs;
    if (elapsed < debounceErrorFlashMs) {
      return current;
    }
  }

  const nextState = nonErrorTargetState(event);
  if (nextState === current.state && current.errorKind === undefined) {
    return current;
  }
  return { state: nextState, enteredAtMs: nowMs };
}

function errorKindForEvent(event: Event): ErrorKind | undefined {
  switch (event) {
    case 'ToolFailed':
      return 'tool-failure';
    case 'UserDenied':
      return 'user-denied';
    default:
      return undefined;
  }
}

function nonErrorTargetState(event: Event): 'idle' | 'running' | 'waiting' {
  switch (event) {
    case 'UserPromptSubmit':
    case 'ToolStarting':
      return 'running';
    case 'WaitingForUser':
      return 'waiting';
    case 'Stop':
      return 'idle';
    case 'SessionStart':
    case 'SessionEnd':
    case 'ToolFailed':
    case 'UserDenied':
      return 'idle';
  }
}
