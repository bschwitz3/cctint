# Manual checks (release)

Run before tagging a release.

## Build

- [ ] `bun install && bun test && bun run lint`
- [ ] `bun run build` → `dist/cctint.js`
- [ ] Clean iTerm2 session (no prior cctint state if you want a full smoke test)

## Install / settings

- [ ] `node dist/cctint.js install --no-shell` adds seven `cctint hook …` entries under `hooks` in `~/.claude/settings.json`
- [ ] Second run is idempotent (one entry per hook)
- [ ] `uninstall` removes those entries and leaves unrelated hooks untouched

## iTerm2 behavior

- [ ] Session start → idle tint (green family)
- [ ] Tool run → running tint (amber)
- [ ] Tool non-zero exit → error tint
- [ ] Approval / blocked UI → waiting tint (red family)
- [ ] Turn completes → back toward idle as events fire
- [ ] `kill -9` on `claude` → `trap` path still resets background (with shell wrapper installed)

## Misc

- [ ] `node dist/cctint.js reset` restores default background
- [ ] With `"logLevel": "debug"` in `~/.config/cctint/config.json`, `~/.config/cctint/log/cctint.log` receives entries
