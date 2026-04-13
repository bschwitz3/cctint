import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { ERROR_KINDS, STATES, type StateSnapshot } from './types';

const SAFE_SESSION_ID = /^[A-Za-z0-9_-]+$/;

export interface StateStore {
  read(sessionId: string): StateSnapshot | undefined;
  write(sessionId: string, snapshot: StateSnapshot): void;
  delete(sessionId: string): void;
}

export function createStateStore(baseDir: string): StateStore {
  function pathFor(sessionId: string): string {
    if (!SAFE_SESSION_ID.test(sessionId)) {
      throw new Error(`unsafe sessionId: ${sessionId}`);
    }
    return join(baseDir, `${sessionId}.json`);
  }

  function ensureDir(): void {
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }
  }

  return {
    read(sessionId) {
      const p = pathFor(sessionId);
      if (!existsSync(p)) return undefined;
      let raw: string;
      try {
        raw = readFileSync(p, 'utf8');
      } catch {
        return undefined;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return undefined;
      }
      return validateSnapshot(parsed);
    },
    write(sessionId, snapshot) {
      ensureDir();
      const final = pathFor(sessionId);
      const tmp = `${final}.${process.pid}.${Date.now()}.tmp`;
      writeFileSync(tmp, JSON.stringify(snapshot), 'utf8');
      renameSync(tmp, final);
    },
    delete(sessionId) {
      const p = pathFor(sessionId);
      if (existsSync(p)) {
        try {
          unlinkSync(p);
        } catch {
          // ignore
        }
      }
    },
  };
}

function validateSnapshot(raw: unknown): StateSnapshot | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (!STATES.includes(r.state as (typeof STATES)[number])) return undefined;
  if (typeof r.enteredAtMs !== 'number') return undefined;
  if (r.errorKind !== undefined && !ERROR_KINDS.includes(r.errorKind as (typeof ERROR_KINDS)[number])) {
    return undefined;
  }
  const snap: StateSnapshot = {
    state: r.state as StateSnapshot['state'],
    enteredAtMs: r.enteredAtMs,
  };
  if (r.errorKind !== undefined) snap.errorKind = r.errorKind as StateSnapshot['errorKind'];
  return snap;
}
