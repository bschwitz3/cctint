export const STATES = ['idle', 'running', 'waiting', 'error'] as const;
export type State = (typeof STATES)[number];

export const EVENTS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'ToolStarting',
  'ToolFailed',
  'WaitingForUser',
  'UserDenied',
  'Stop',
] as const;
export type Event = (typeof EVENTS)[number];

export const ERROR_KINDS = ['tool-failure', 'user-denied', 'session-died'] as const;
export type ErrorKind = (typeof ERROR_KINDS)[number];

export const ERROR_PRIORITY: Record<ErrorKind, number> = {
  'tool-failure': 1,
  'user-denied': 2,
  'session-died': 3,
};

export interface StateSnapshot {
  state: State;
  errorKind?: ErrorKind;
  enteredAtMs: number;
}
