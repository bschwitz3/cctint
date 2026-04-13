import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Paths {
  globalConfig: string;
  projectConfig: string;
  stateDir: string;
  logFile: string;
}

export function resolvePaths(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): Paths {
  const xdgConfig = env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  const base = join(xdgConfig, 'cctint');
  return {
    globalConfig: join(base, 'config.json'),
    projectConfig: join(cwd, '.cctint.json'),
    stateDir: join(base, 'state'),
    logFile: join(base, 'log', 'cctint.log'),
  };
}
