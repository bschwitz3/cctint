import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStateStore } from '../state-store';
import type { StateSnapshot } from '../types';

describe('state-store', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cctint-state-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('read returns undefined when no file exists', () => {
    const store = createStateStore(dir);
    expect(store.read('session-abc')).toBeUndefined();
  });

  test('write then read round-trips', () => {
    const store = createStateStore(dir);
    const snap: StateSnapshot = { state: 'running', enteredAtMs: 123 };
    store.write('session-abc', snap);
    expect(store.read('session-abc')).toEqual(snap);
  });

  test('write with errorKind round-trips', () => {
    const store = createStateStore(dir);
    const snap: StateSnapshot = { state: 'error', errorKind: 'user-denied', enteredAtMs: 99 };
    store.write('session-abc', snap);
    expect(store.read('session-abc')).toEqual(snap);
  });

  test('write is atomic — no tempfile left behind after write', () => {
    const store = createStateStore(dir);
    store.write('session-abc', { state: 'idle', enteredAtMs: 0 });
    const entries = readdirSync(dir);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toBe('session-abc.json');
  });

  test('read returns undefined when file is corrupt', () => {
    const store = createStateStore(dir);
    writeFileSync(join(dir, 'session-abc.json'), '{not json');
    expect(store.read('session-abc')).toBeUndefined();
  });

  test('read returns undefined when schema is invalid', () => {
    const store = createStateStore(dir);
    writeFileSync(join(dir, 'session-abc.json'), JSON.stringify({ state: 'purple', enteredAtMs: 0 }));
    expect(store.read('session-abc')).toBeUndefined();
  });

  test('delete removes the session file', () => {
    const store = createStateStore(dir);
    store.write('session-abc', { state: 'idle', enteredAtMs: 0 });
    store.delete('session-abc');
    expect(store.read('session-abc')).toBeUndefined();
  });

  test('delete on missing file does not throw', () => {
    const store = createStateStore(dir);
    expect(() => store.delete('never-existed')).not.toThrow();
  });

  test('sessionId with unsafe chars is rejected', () => {
    const store = createStateStore(dir);
    expect(() => store.write('../evil', { state: 'idle', enteredAtMs: 0 })).toThrow();
  });
});
