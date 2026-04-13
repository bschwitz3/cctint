# cctint — design spec

**Date:** 2026-04-13 · **Status:** reflects shipped v0.1.x

## 1. Purpose

CLI companion for **Claude Code** on **macOS + iTerm2**: tint terminal background by session state so many concurrent sessions stay readable.

## 2. Scope

**In:** four states + distinct tints; `~/.config/cctint/config.json` + optional `./.cctint.json`; `cctint install` into global or project `.claude/settings.json`; zsh/bash `trap` wrapper; `cctint reset`.

**Out (v1):** other terminals, Linux/Windows, TUI configurator.

## 3. States

| State     | Default `bg`   | Meaning                                      |
| --------- | -------------- | -------------------------------------------- |
| `idle`    | `#224a22`      | Waiting for user input                       |
| `running` | `#4a4a22`      | Prompt submitted / tool activity             |
| `waiting` | `#5a2828`      | Blocked on approval or similar               |
| `error`   | `#6a2222`      | Tool failure, denial, or session error path  |

**Error priority** (when several apply): `session-died` → `user-denied` → `tool-failure`. **Debounce:** `debounce.errorFlashMs` (default 1500) reduces immediate overwrite of `error` by lower-priority transitions.

### Hook → behavior (summary)

| Event / hook           | Effect (typical)                                      |
| ---------------------- | ----------------------------------------------------- |
| `SessionStart`         | → `idle`                                              |
| `UserPromptSubmit`     | → `running`                                           |
| `PreToolUse`           | stay `running`                                        |
| `PostToolUse`          | non-zero exit → `error`; else often stay `running`    |
| `Notification`         | → `waiting` or error-flash per payload                |
| `Stop`                 | → `idle`                                              |
| `SessionEnd`           | full reset (default background / default profile)   |

Per-session state: `~/.config/cctint/state/<session-id>.json` (atomic write).

## 4. Architecture

Bun + TypeScript; `bun build` → `dist/cctint.js`. **Invariant:** `cctint hook` never breaks Claude Code — catch errors, exit 0, **never write stdout**. **Escape codes:** write to **`/dev/tty`** when available (Claude captures hook stderr); fallback `stderr` for CI/tests.

### Layout

```
src/
  cli.ts
  commands/     hook, install, uninstall, reset
  core/         state-machine, state-store, types
  hooks/        parser, event-map, registration
  terminal/     backend, iterm2
  config/       schema, loader, defaults
  shell/        wrapper, rc
  util/         paths, logger
```

**Rules**

- `core/` — pure; no filesystem or `process.exit` in the state machine itself.
- Backends implement `Backend`; v1 is iTerm2 only.
- Logger is file-only (`~/.config/cctint/log/cctint.log`); verbosity from config `logLevel`, not stdout.
- Config: Zod; invalid global config → CLI errors; hook path uses defaults + warn.

## 5. Modes

- **`live-color`** — `\e]1337;SetColors=bg=RRGGBB\a` (and reset via `bg=default` plus OSC 111 where applicable).
- **`profile-switch`** — `\e]1337;SetProfile=<name>\a`; user-defined iTerm profiles in config.

## 6. Config (sketch)

Global `~/.config/cctint/config.json`, shallow-merge `./.cctint.json`. All keys optional.

```jsonc
{
  "mode": "live-color",
  "colors": {
    "idle": { "bg": "#224a22" },
    "running": { "bg": "#4a4a22" },
    "waiting": { "bg": "#5a2828" },
    "error": { "bg": "#6a2222" }
  },
  "profiles": { "default": "", "idle": "…", "running": "…", "waiting": "…", "error": "…" },
  "debounce": { "errorFlashMs": 1500 },
  "enabled": true,
  "logLevel": "warn"
}
```

`enabled: false` → hook no-op. `logLevel`: `silent` | `warn` | `info` | `debug`.

## 7. Install / uninstall

`install`: merge hook commands (prefix `cctint hook` for idempotency); optional shell block with clear markers; validate profile mode if used. `uninstall`: strip those hooks and the shell block only.

## 8. Errors & edge cases

| Case                         | Hook path behavior                          |
| ---------------------------- | ------------------------------------------- |
| Not iTerm2                   | No-op                                       |
| Bad config JSON              | Defaults + log                              |
| Bad hook stdin               | Best-effort parse; log; still exit 0        |
| `enabled: false`             | No-op                                       |
| Concurrent hooks             | Atomic state file; last-writer acceptable   |

## 9. Testing

Vitest (`bun test`). Unit tests for core, hooks, config, terminal bytes, shell snippets; integration-style tests under `commands/` with tmpdirs. **Manual:** [TESTING.md](../../TESTING.md).

## 10. Later ideas

Other terminals (`$TERM_PROGRAM` backends), more states, optional audio/badge escalation — additive, not required for v1.
