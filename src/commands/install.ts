import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { registerHooks } from '../hooks/registration';
import { installShellWrapper } from '../shell/rc';

export interface InstallOptions {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd: string;
  writeStdout: (s: string) => void;
  writeStderr: (s: string) => void;
  binPath: string;
}

export async function runInstallCommand(opts: InstallOptions): Promise<number> {
  const scope = opts.argv.includes('--scope')
    ? opts.argv[opts.argv.indexOf('--scope') + 1]
    : 'global';
  const noShell = opts.argv.includes('--no-shell');

  if (opts.env.TERM_PROGRAM !== 'iTerm.app') {
    opts.writeStderr(
      'warning: TERM_PROGRAM is not "iTerm.app"; cctint only tints iTerm2, but proceeding.\n',
    );
  }

  const settingsFile = resolveSettingsFile(scope, opts);
  try {
    registerHooks(settingsFile, { binPath: opts.binPath });
  } catch (err) {
    opts.writeStderr(`cctint install: ${String(err instanceof Error ? err.message : err)}\n`);
    return 1;
  }

  if (!noShell) {
    const home = opts.env.HOME;
    if (home) {
      const zshrc = join(home, '.zshrc');
      if (existsSync(zshrc) || scope === 'global') {
        installShellWrapper(zshrc);
      }
      const bashrc = join(home, '.bashrc');
      if (existsSync(bashrc)) {
        installShellWrapper(bashrc);
      }
    }
  }

  opts.writeStdout(`cctint installed (scope: ${scope}). Restart your shell to activate.\n`);
  return 0;
}

function resolveSettingsFile(
  scope: string | undefined,
  opts: { env: Record<string, string | undefined>; cwd: string },
): string {
  if (scope === 'project') {
    return join(opts.cwd, '.claude', 'settings.json');
  }
  const home = opts.env.HOME ?? '';
  return join(home, '.claude', 'settings.json');
}
