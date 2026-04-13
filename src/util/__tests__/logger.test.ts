import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger } from '../logger';

describe('logger', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cctint-log-'));
    file = join(dir, 'log', 'cctint.log');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('silent level writes nothing', () => {
    const log = createLogger({ logFile: file, level: 'silent' });
    log.warn('hello');
    log.info('hello');
    log.debug('hello');
    expect(existsSync(file)).toBe(false);
  });

  test('warn level writes warn but not info/debug', () => {
    const log = createLogger({ logFile: file, level: 'warn' });
    log.warn('w');
    log.info('i');
    log.debug('d');
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('WARN');
    expect(content).toContain('w');
    expect(content).not.toContain('INFO');
    expect(content).not.toContain('DEBUG');
  });

  test('info level writes warn and info but not debug', () => {
    const log = createLogger({ logFile: file, level: 'info' });
    log.warn('w');
    log.info('i');
    log.debug('d');
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('WARN');
    expect(content).toContain('INFO');
    expect(content).not.toContain('DEBUG');
  });

  test('debug level writes everything', () => {
    const log = createLogger({ logFile: file, level: 'debug' });
    log.warn('w');
    log.info('i');
    log.debug('d');
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('WARN');
    expect(content).toContain('INFO');
    expect(content).toContain('DEBUG');
  });

  test('writes each record as a JSON line with timestamp', () => {
    const log = createLogger({ logFile: file, level: 'warn' });
    log.warn('hello', { foo: 'bar' });
    const line = readFileSync(file, 'utf8').trim();
    const record = JSON.parse(line);
    expect(record.level).toBe('WARN');
    expect(record.msg).toBe('hello');
    expect(record.foo).toBe('bar');
    expect(typeof record.ts).toBe('string');
  });

  test('logger creates the log directory if missing', () => {
    const log = createLogger({ logFile: file, level: 'warn' });
    log.warn('x');
    expect(existsSync(file)).toBe(true);
  });
});
