import { describe, expect, test } from 'vitest';
import { SHELL_WRAPPER_START, SHELL_WRAPPER_END, buildShellWrapper } from '../wrapper';

describe('buildShellWrapper', () => {
  test('contains START and END markers', () => {
    const snippet = buildShellWrapper();
    expect(snippet.startsWith(SHELL_WRAPPER_START)).toBe(true);
    expect(snippet.trimEnd().endsWith(SHELL_WRAPPER_END)).toBe(true);
  });

  test('wraps claude with trap calling cctint reset', () => {
    const snippet = buildShellWrapper();
    expect(snippet).toContain('claude() {');
    expect(snippet).toContain("trap 'cctint reset 2>/dev/null' EXIT INT TERM HUP");
    expect(snippet).toContain('command claude "$@"');
  });

  test('runs claude in a subshell so the trap fires on return in bash and zsh', () => {
    const snippet = buildShellWrapper();
    // Subshell structure: `(` then trap, claude, `)`
    expect(snippet).toMatch(/\(\s*trap[^)]*command claude "\$@"\s*\)/s);
  });

  test('resets after subshell as belt-and-suspenders', () => {
    const snippet = buildShellWrapper();
    // `cctint reset` appears both inside the trap and after the subshell returns
    const matches = snippet.match(/cctint reset/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('preserves claude exit code', () => {
    const snippet = buildShellWrapper();
    expect(snippet).toContain('return $_cctint_rc');
  });

  test('guards on cctint presence', () => {
    const snippet = buildShellWrapper();
    expect(snippet).toContain('command -v cctint >/dev/null 2>&1');
  });

  test('uses single quotes inside the trap to avoid early expansion', () => {
    const snippet = buildShellWrapper();
    expect(snippet).toContain("trap 'cctint reset 2>/dev/null'");
  });
});
