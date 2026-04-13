import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type LogLevel = 'silent' | 'warn' | 'info' | 'debug';

export interface Logger {
  warn(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  debug(msg: string, extra?: Record<string, unknown>): void;
}

const ORDER: Record<LogLevel, number> = { silent: 0, warn: 1, info: 2, debug: 3 };

export interface LoggerOptions {
  logFile: string;
  level: LogLevel;
}

export function createLogger(opts: LoggerOptions): Logger {
  const threshold = ORDER[opts.level];
  function write(level: 'warn' | 'info' | 'debug', msg: string, extra?: Record<string, unknown>): void {
    if (ORDER[level] > threshold) return;
    try {
      const dir = dirname(opts.logFile);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const record = { ts: new Date().toISOString(), level: level.toUpperCase(), msg, ...(extra ?? {}) };
      appendFileSync(opts.logFile, JSON.stringify(record) + '\n', 'utf8');
    } catch {
      // Best-effort: logging failures must not break the caller.
    }
  }
  return {
    warn: (msg, extra) => write('warn', msg, extra),
    info: (msg, extra) => write('info', msg, extra),
    debug: (msg, extra) => write('debug', msg, extra),
  };
}
