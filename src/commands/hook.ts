import { loadConfig } from '../config/loader';
import { createStateStore } from '../core/state-store';
import { transition } from '../core/state-machine';
import { iterm2Backend } from '../terminal/iterm2';
import { parsePayload } from '../hooks/parser';
import { hookToEvent } from '../hooks/event-map';
import { createLogger } from '../util/logger';
import type { StateSnapshot } from '../core/types';

export interface RunHookOptions {
  hookName: string;
  stdin: string;
  paths: { globalConfig: string; projectConfig: string; stateDir: string; logFile: string };
  writeStderr: (s: string) => void;
  writeStdout: (s: string) => void;
  env: Record<string, string | undefined>;
  nowMs: number;
}

export async function runHookCommand(opts: RunHookOptions): Promise<number> {
  const log = createLogger({ logFile: opts.paths.logFile, level: 'warn' });
  try {
    if (opts.env.TERM_PROGRAM !== 'iTerm.app') {
      return 0;
    }
    const config = loadConfig({
      globalPath: opts.paths.globalConfig,
      projectPath: opts.paths.projectConfig,
      strict: false,
    });
    if (!config.enabled) return 0;

    const effectiveLog = createLogger({ logFile: opts.paths.logFile, level: config.logLevel });

    const payload = parsePayload(opts.stdin);
    const event = hookToEvent(opts.hookName, payload);

    // SessionEnd: emit reset and drop state
    if (opts.hookName === 'SessionEnd') {
      safeWrite(opts.writeStderr, iterm2Backend.encodeReset(config), effectiveLog);
      createStateStore(opts.paths.stateDir).delete(payload.sessionId);
      return 0;
    }

    if (event === undefined) {
      // Unknown hook name: nothing to do.
      return 0;
    }

    const store = createStateStore(opts.paths.stateDir);
    const current: StateSnapshot = store.read(payload.sessionId) ?? { state: 'idle', enteredAtMs: 0 };

    // Stale notification guard: the Notification hook fires when Claude Code sends a
    // desktop notification, which can be seconds after the tool-approval dialog appeared.
    // If Stop has already fired (state = idle), the notification is outdated — ignore it
    // to prevent getting stuck in the waiting state after a quick denial.
    if (opts.hookName === 'Notification' && current.state === 'idle') {
      return 0;
    }
    const next = transition({
      current,
      event,
      nowMs: opts.nowMs,
      debounceErrorFlashMs: config.debounce.errorFlashMs,
    });

    if (!snapshotsEqual(current, next)) {
      store.write(payload.sessionId, next);
    }

    // Emit rule:
    //   - SessionStart: ALWAYS emit idle, even when the machine returned an unchanged snapshot.
    //     This preserves the invariant "every fresh/resumed session is green" per the spec.
    //   - Other events: emit only when the visible state or errorKind changed.
    const forceEmit = event === 'SessionStart';
    if (forceEmit || stateBehaviorChanged(current, next)) {
      safeWrite(opts.writeStderr, iterm2Backend.encodeState(next.state, config), effectiveLog);
    }
    return 0;
  } catch (err) {
    log.warn('hook command failed', { err: String(err), hookName: opts.hookName });
    return 0;
  }
}

function snapshotsEqual(a: StateSnapshot, b: StateSnapshot): boolean {
  return a.state === b.state && a.errorKind === b.errorKind && a.enteredAtMs === b.enteredAtMs;
}

function stateBehaviorChanged(a: StateSnapshot, b: StateSnapshot): boolean {
  return a.state !== b.state || a.errorKind !== b.errorKind;
}

function safeWrite(
  write: (s: string) => void,
  chunk: string,
  log: { warn: (m: string, e?: Record<string, unknown>) => void },
): void {
  try {
    write(chunk);
  } catch (err) {
    log.warn('stderr write failed', { err: String(err) });
  }
}
