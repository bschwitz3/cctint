#!/usr/bin/env bun
import { fileURLToPath } from 'node:url';
import { openSync, writeSync } from 'node:fs';
import { runHookCommand } from './commands/hook';
import { runInstallCommand } from './commands/install';
import { runUninstallCommand } from './commands/uninstall';
import { runResetCommand } from './commands/reset';
import { resolvePaths } from './util/paths';

export interface CliIO {
  argv: string[];
  stdin: string;
  env: Record<string, string | undefined>;
  cwd: string;
  writeStdout: (s: string) => void;
  writeStderr: (s: string) => void;
}

export async function mainAsync(io: CliIO): Promise<number> {
  const command = io.argv[2];
  if (!command || command === '--help' || command === '-h') {
    io.writeStderr(
      [
        'cctint — tint iTerm2 based on Claude Code state',
        '',
        'usage:',
        '  cctint install [--scope global|project] [--no-shell]',
        '  cctint uninstall',
        '  cctint reset',
        '  cctint hook <HookName>          # invoked by Claude Code',
        '',
      ].join('\n'),
    );
    return 0;
  }

  switch (command) {
    case 'hook': {
      const hookName = io.argv[3];
      if (!hookName) {
        io.writeStderr('cctint: missing hook name\n');
        return 1;
      }
      const paths = resolvePaths(io.env, io.cwd);
      return runHookCommand({
        hookName,
        stdin: io.stdin,
        paths,
        writeStderr: io.writeStderr,
        writeStdout: io.writeStdout,
        env: io.env,
        nowMs: Date.now(),
      });
    }
    case 'install':
      return runInstallCommand({
        argv: io.argv.slice(2),
        env: io.env,
        cwd: io.cwd,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
        binPath: 'cctint',
      });
    case 'uninstall':
      return runUninstallCommand({
        argv: io.argv.slice(2),
        env: io.env,
        cwd: io.cwd,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
      });
    case 'reset':
      return runResetCommand({
        argv: io.argv.slice(2),
        env: io.env,
        cwd: io.cwd,
        writeStdout: io.writeStdout,
        writeStderr: io.writeStderr,
      });
    default:
      io.writeStderr(`cctint: unknown command: ${command}\n`);
      return 1;
  }
}

/**
 * Opens /dev/tty for writing escape codes. Claude Code captures stderr from hook
 * subprocesses, so writing to stderr has no effect on the terminal. /dev/tty is
 * the controlling terminal and bypasses all redirection, including Claude Code's
 * stdio capture. Falls back to stderr for non-TTY environments (CI, tests).
 */
function makeTtyWriter(): (s: string) => void {
  try {
    const fd = openSync('/dev/tty', 'w');
    return (s: string) => {
      writeSync(fd, s);
    };
  } catch {
    return (s: string) => {
      process.stderr.write(s);
    };
  }
}

export function main(argv: string[]): number {
  // Kept for smoke-test backward compatibility; production path uses mainAsync.
  if (!argv[2] || argv[2] === '--help' || argv[2] === '-h') return 0;
  return 1;
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const writeTty = makeTtyWriter();
  const stdinChunks: Buffer[] = [];
  // If stdin is a tty (no pipe), 'end' won't fire — drain immediately with empty stdin.
  if (process.stdin.isTTY) {
    (async () => {
      const code = await mainAsync({
        argv: process.argv,
        stdin: '',
        env: process.env,
        cwd: process.cwd(),
        writeStdout: (s) => process.stdout.write(s),
        writeStderr: writeTty,
      });
      process.exit(code);
    })();
  } else {
    process.stdin.on('data', (c) => stdinChunks.push(c as Buffer));
    process.stdin.on('end', async () => {
      const code = await mainAsync({
        argv: process.argv,
        stdin: Buffer.concat(stdinChunks).toString('utf8'),
        env: process.env,
        cwd: process.cwd(),
        writeStdout: (s) => process.stdout.write(s),
        writeStderr: writeTty,
      });
      process.exit(code);
    });
  }
}
