import { z } from 'zod';
import { DEFAULT_CONFIG, type Config } from './defaults';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'bg must be a 6-digit hex string like "#1f3a1f"');

const colorBlock = z.object({ bg: hex });

const colorsSchema = z
  .object({
    idle: colorBlock.partial().optional(),
    running: colorBlock.partial().optional(),
    waiting: colorBlock.partial().optional(),
    error: colorBlock.partial().optional(),
  })
  .optional();

const profilesSchema = z
  .object({
    default: z.string().optional(),
    idle: z.string().optional(),
    running: z.string().optional(),
    waiting: z.string().optional(),
    error: z.string().optional(),
  })
  .optional();

const rawConfigSchema = z
  .object({
    mode: z.enum(['live-color', 'profile-switch']).optional(),
    colors: colorsSchema,
    profiles: profilesSchema,
    debounce: z.object({ errorFlashMs: z.number().int().min(0).max(60_000).optional() }).optional(),
    enabled: z.boolean().optional(),
    logLevel: z.enum(['silent', 'warn', 'info', 'debug']).optional(),
  })
  .strict();

export function parseConfig(raw: unknown): Config {
  const parsed = rawConfigSchema.parse(raw);
  const mode = parsed.mode ?? DEFAULT_CONFIG.mode;
  const logLevel = parsed.logLevel ?? DEFAULT_CONFIG.logLevel;
  const merged = {
    mode,
    colors: {
      idle: { bg: parsed.colors?.idle?.bg ?? DEFAULT_CONFIG.colors.idle.bg },
      running: { bg: parsed.colors?.running?.bg ?? DEFAULT_CONFIG.colors.running.bg },
      waiting: { bg: parsed.colors?.waiting?.bg ?? DEFAULT_CONFIG.colors.waiting.bg },
      error: { bg: parsed.colors?.error?.bg ?? DEFAULT_CONFIG.colors.error.bg },
    },
    profiles: {
      default: parsed.profiles?.default ?? DEFAULT_CONFIG.profiles.default,
      idle: parsed.profiles?.idle ?? DEFAULT_CONFIG.profiles.idle,
      running: parsed.profiles?.running ?? DEFAULT_CONFIG.profiles.running,
      waiting: parsed.profiles?.waiting ?? DEFAULT_CONFIG.profiles.waiting,
      error: parsed.profiles?.error ?? DEFAULT_CONFIG.profiles.error,
    },
    debounce: { errorFlashMs: parsed.debounce?.errorFlashMs ?? DEFAULT_CONFIG.debounce.errorFlashMs },
    enabled: parsed.enabled ?? DEFAULT_CONFIG.enabled,
    logLevel,
  } as Config;
  if (mode === 'profile-switch' && !merged.profiles.default) {
    throw new Error('profiles.default must be set when mode is "profile-switch"');
  }
  return merged;
}
