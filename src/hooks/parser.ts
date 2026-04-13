export interface HookPayload {
  /** Claude Code session identifier; used to key per-session state. */
  sessionId: string;
  /** Whether this payload signals a tool-level failure (PostToolUse only). */
  toolFailed: boolean;
  /** Whether this payload signals a user-denial (Notification only). */
  userDenied: boolean;
  /** Raw parsed object; useful for logging, never consulted by state logic. */
  raw: Record<string, unknown>;
}

const SAFE_SESSION = /^[A-Za-z0-9_-]+$/;

export function parsePayload(raw: string): HookPayload {
  const empty: HookPayload = {
    sessionId: 'default',
    toolFailed: false,
    userDenied: false,
    raw: {},
  };
  if (!raw) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return empty;
  }
  const obj = parsed as Record<string, unknown>;

  const sessionIdRaw = obj['session_id'];
  const sessionId =
    typeof sessionIdRaw === 'string' && SAFE_SESSION.test(sessionIdRaw) ? sessionIdRaw : 'default';

  const toolResponse = obj['tool_response'];
  let toolFailed = false;
  if (typeof toolResponse === 'object' && toolResponse !== null) {
    const tr = toolResponse as Record<string, unknown>;
    if (tr['success'] === false) toolFailed = true;
    if (typeof tr['exitCode'] === 'number' && tr['exitCode'] !== 0) toolFailed = true;
  }

  const message = obj['message'];
  const userDenied =
    typeof message === 'string' &&
    /deny|denied|reject|rejected|cancel(?:l?ed)?|block(?:ed)?/i.test(message);

  return { sessionId, toolFailed, userDenied, raw: obj };
}
