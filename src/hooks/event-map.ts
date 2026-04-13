import type { Event } from '../core/types';
import type { HookPayload } from './parser';

export const HOOK_NAMES = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'Stop',
] as const;
export type HookName = (typeof HOOK_NAMES)[number];

export function hookToEvent(hook: string, payload: HookPayload): Event | undefined {
  switch (hook) {
    case 'SessionStart':
      return 'SessionStart';
    case 'SessionEnd':
      return 'SessionEnd';
    case 'UserPromptSubmit':
      return 'UserPromptSubmit';
    case 'PreToolUse':
      return 'ToolStarting';
    case 'PostToolUse':
      // Tool completed successfully → Claude is still processing (running/yellow).
      // Without this, a PostToolUse that follows a Notification (waiting/red)
      // would leave the terminal stuck in waiting even though Claude is active.
      return payload.toolFailed ? 'ToolFailed' : 'ToolStarting';
    case 'Notification':
      return payload.userDenied ? 'UserDenied' : 'WaitingForUser';
    case 'Stop':
      return 'Stop';
    default:
      return undefined;
  }
}
