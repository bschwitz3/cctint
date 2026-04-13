import { existsSync, readFileSync } from 'node:fs';
import { parseConfig } from './schema';
import type { Config } from './defaults';

export interface LoadConfigOptions {
  globalPath: string;
  projectPath: string;
  strict?: boolean;
}

export function loadConfig(opts: LoadConfigOptions): Config {
  const strict = opts.strict ?? false;
  const global = readRaw(opts.globalPath, strict) ?? {};
  const project = readRaw(opts.projectPath, strict) ?? {};
  const merged = deepMerge(global, project);
  try {
    return parseConfig(merged);
  } catch (err) {
    if (strict) throw err;
    return parseConfig({});
  }
}

function readRaw(path: string, strict: boolean): Record<string, unknown> | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      if (strict) throw new Error(`config at ${path} must be a JSON object`);
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (strict) throw err;
    return undefined;
  }
}

function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    if (isPlainObject(prev) && isPlainObject(v)) {
      out[k] = deepMerge(prev, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
