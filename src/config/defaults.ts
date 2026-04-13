export const DEFAULT_CONFIG = {
  mode: 'live-color' as const,
  colors: {
    idle: { bg: '#224a22' },
    running: { bg: '#4a4a22' },
    waiting: { bg: '#5a2828' },
    error: { bg: '#6a2222' },
  },
  profiles: {
    default: '',
    idle: 'CC-Idle',
    running: 'CC-Running',
    waiting: 'CC-Waiting',
    error: 'CC-Error',
  },
  debounce: {
    errorFlashMs: 1500,
  },
  enabled: true,
  logLevel: 'warn' as const,
};

export type Config = typeof DEFAULT_CONFIG;
