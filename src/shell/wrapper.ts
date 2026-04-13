export const SHELL_WRAPPER_START = '# >>> cctint shell integration >>>';
export const SHELL_WRAPPER_END = '# <<< cctint shell integration <<<';

export function buildShellWrapper(): string {
  // Runs `command claude` inside a subshell so:
  //   * The EXIT trap fires reliably in both bash and zsh when Claude exits
  //     (bash does not fire function-local EXIT on return; subshell scopes it).
  //   * The trap does not leak into the parent shell.
  // After the subshell exits, we reset again as belt-and-suspenders — covers
  // the rare case where /exit doesn't propagate a SessionEnd hook in time.
  return (
    SHELL_WRAPPER_START +
    '\n' +
    'if command -v cctint >/dev/null 2>&1; then\n' +
    '  claude() {\n' +
    '    (\n' +
    "      trap 'cctint reset 2>/dev/null' EXIT INT TERM HUP\n" +
    '      command claude "$@"\n' +
    '    )\n' +
    '    local _cctint_rc=$?\n' +
    '    cctint reset 2>/dev/null\n' +
    '    return $_cctint_rc\n' +
    '  }\n' +
    'fi\n' +
    SHELL_WRAPPER_END +
    '\n'
  );
}
