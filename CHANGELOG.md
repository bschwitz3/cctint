# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [0.1.0] — 2026-04-13

Initial release: iTerm2 tinting from Claude Code hooks (`idle` / `running` / `waiting` / `error`), `live-color` and `profile-switch` modes, Zod config with global + `.cctint.json` overlay, per-session state under `~/.config/cctint/state/`, debounced error priority, `install` / `uninstall` / `reset`, zsh+bash `trap` wrapper, `scripts/install-bin.sh`. Escape sequences go to `/dev/tty` when available (not stderr), so hooks still work under Claude’s capture.

[Unreleased]: https://github.com/bschwitz3/cctint/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bschwitz3/cctint/releases/tag/v0.1.0
