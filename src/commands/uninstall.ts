import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { unregisterHooks } from '../hooks/registration';
import { uninstallShellWrapper } from '../shell/rc';

export interface UninstallOptions {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd: string;
  writeStdout: (s: string) => void;
  writeStderr: (s: string) => void;
}

export async function runUninstallCommand(opts: UninstallOptions): Promise<number> {
  const home = opts.env.HOME ?? '';
  const globalSettings = join(home, '.claude', 'settings.json');
  const projectSettings = join(opts.cwd, '.claude', 'settings.json');

  if (existsSync(globalSettings)) unregisterHooks(globalSettings);
  if (existsSync(projectSettings)) unregisterHooks(projectSettings);

  if (home) {
    uninstallShellWrapper(join(home, '.zshrc'));
    uninstallShellWrapper(join(home, '.bashrc'));
  }

  opts.writeStdout('cctint uninstalled.\n');
  return 0;
}
