#!/bin/sh
# Installs a `cctint` wrapper into $PREFIX (default: /usr/local/bin) that execs
# this repo's compiled bundle via bun.
#
# Usage:
#   ./scripts/install-bin.sh                 # installs to /usr/local/bin (uses sudo if needed)
#   PREFIX=$HOME/.local/bin ./scripts/install-bin.sh   # user-local, no sudo

set -eu

PREFIX="${PREFIX:-/usr/local/bin}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$REPO_DIR/dist/cctint.js"
TARGET="$PREFIX/cctint"

if [ ! -f "$BUNDLE" ]; then
  echo "error: $BUNDLE not found — run 'bun run build' first" >&2
  exit 1
fi

# Prefer bun for faster startup; fall back to node. People with only Node
# installed don't need to install bun just to run cctint.
if command -v bun >/dev/null 2>&1; then
  RUNTIME="bun"
elif command -v node >/dev/null 2>&1; then
  RUNTIME="node"
else
  echo "error: neither 'bun' nor 'node' found in PATH" >&2
  echo "       install bun (https://bun.sh) or node (https://nodejs.org) first" >&2
  exit 1
fi

WRAPPER_CONTENT="#!/bin/sh
exec $RUNTIME $BUNDLE \"\$@\"
"

write_wrapper() {
  if [ -w "$PREFIX" ] || { [ ! -e "$PREFIX" ] && mkdir -p "$PREFIX" 2>/dev/null; }; then
    printf '%s' "$WRAPPER_CONTENT" > "$TARGET"
    chmod +x "$TARGET"
  else
    echo "note: $PREFIX requires elevated permissions; using sudo" >&2
    printf '%s' "$WRAPPER_CONTENT" | sudo tee "$TARGET" >/dev/null
    sudo chmod +x "$TARGET"
  fi
}

write_wrapper

echo "✓ installed: $TARGET"
echo ""
echo "next steps:"
echo "  1. Ensure $PREFIX is in your PATH"
echo "  2. Run: cctint install"
echo "  3. Open a new iTerm2 window"
