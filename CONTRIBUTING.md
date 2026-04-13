# Contributing

Small tool, tight PRs welcome.

## Setup

```bash
git clone <your-fork>/cctint.git && cd cctint
bun install
bun test && bun run lint
```

Before opening a PR: `bun test && bun run lint && bun run build`.

## Guidelines

1. **Issue first** for non-trivial changes (new backends, states, schema).
2. **Tests** — reproduce bugs in a test; new behavior needs happy path + one failure mode (`src/**/__tests__/`).
3. **One topic per PR** — no drive-by refactors mixed with features.

Architecture (details in `docs/superpowers/specs/2026-04-13-cctint-design.md`):

- `src/core/` stays pure (no FS, no `process.exit`).
- `cctint hook …` must exit **0**, never write **stdout**; escape codes via **`/dev/tty`** when possible (stderr only as fallback).
- Config: Zod; hook path falls back to defaults, CLI commands fail loudly.

**Commits:** imperative, lowercase, roughly conventional (`feat:`, `fix:`, `test:`, `docs:`). Rebase before PR.

**PRs:** explain why, link issues, screenshots for visible changes, green CI, no unjustified `eslint-disable`.

**Bugs:** use the issue template (`$TERM_PROGRAM`, shell, macOS, `cctint --help`, logs with `"logLevel": "debug"` if useful).

**Questions:** GitHub Discussions if enabled; otherwise a focused issue.
