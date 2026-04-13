#!/usr/bin/env bash
# One-shot: create public repo, push main, protect main (PR + your review as code owner).
# Prerequisites: brew install gh && gh auth login

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GH_BIN="${GH_BIN:-$(command -v gh || true)}"
if [[ -z "$GH_BIN" && -x /opt/homebrew/bin/gh ]]; then GH_BIN=/opt/homebrew/bin/gh; fi
if [[ -z "$GH_BIN" ]]; then echo "Install GitHub CLI: brew install gh" >&2; exit 1; fi

if ! "$GH_BIN" auth status &>/dev/null; then
  echo "Run: gh auth login   (then re-run this script)" >&2
  exit 1
fi

OWNER="$("$GH_BIN" api user -q .login)"
REPO="cctint"
FULL="$OWNER/$REPO"

if ! "$GH_BIN" repo view "$FULL" &>/dev/null; then
  "$GH_BIN" repo create "$FULL" --public --source=. --remote=origin --push --description "Tint iTerm2 from Claude Code session state"
else
  echo "Repo $FULL already exists; setting origin and pushing"
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$FULL.git"
  git push -u origin main
fi

# Branch protection: collaborators need PR + 1 approval + CODEOWNERS pass.
# Repo admins (you) can still merge when needed (enforce_admins: false) so solo work is not deadlocked.
"$GH_BIN" api --method PUT "repos/$FULL/branches/main/protection" --input - <<'PROTECT'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
PROTECT

echo "Done: https://github.com/$FULL"
echo "main is protected: PR required, 1 approval, CODEOWNERS review. Admins may bypass (see script comment)."
