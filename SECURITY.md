# Security policy

## Reporting

Do **not** file public issues for security problems. Use GitHub’s [security advisory form](https://github.com/bschwitz3/cctint/security/advisories/new), or email `bschwitz33@gmail.com`.

Acknowledgement within ~5 business days; fix timeline depends on severity (often within ~30 days for confirmed issues).

## Scope

cctint is a local CLI. Relevant surface:

- **Config** — Zod-validated; bad config is rejected or falls back to defaults on the hook path.
- **Hook stdin** — JSON from Claude Code; parse failures are logged; hook still exits 0.
- **settings.json** — only entries whose command contains `cctint hook` are removed on uninstall; install refuses to run if the file is corrupt JSON (avoids wiping the file).
- **Shell snippet** — a marked block in `~/.zshrc` / `~/.bashrc` for install/uninstall.

Out of scope: Claude Code, iTerm2, the shell itself, and issues that only apply with extra privilege beyond what cctint uses at runtime.
