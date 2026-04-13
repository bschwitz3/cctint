import { loadConfig } from '../config/loader';
import { iterm2Backend } from '../terminal/iterm2';
import { resolvePaths } from '../util/paths';

export interface ResetOptions {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd: string;
  writeStdout: (s: string) => void;
  writeStderr: (s: string) => void;
}

export async function runResetCommand(opts: ResetOptions): Promise<number> {
  // Build env with XDG_CONFIG_HOME derived from HOME if not already set,
  // so that resolvePaths uses the test-controlled home directory.
  const env: Record<string, string | undefined> = { ...opts.env };
  if (!env.XDG_CONFIG_HOME && env.HOME) {
    env.XDG_CONFIG_HOME = `${env.HOME}/.config`;
  }
  const paths = resolvePaths(env, opts.cwd);
  let config;
  try {
    config = loadConfig({
      globalPath: paths.globalConfig,
      projectPath: paths.projectConfig,
      strict: false,
    });
  } catch {
    opts.writeStderr('\x1b]1337;SetColors=bg=default\x07\x1b]111\x07');
    return 0;
  }
  opts.writeStderr(iterm2Backend.encodeReset(config));
  return 0;
}
