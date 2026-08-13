#!/usr/bin/env bash
# bootstrap.sh — one-time setup for kapphelper on a Linux host
#
# Usage:
#   cd ~/klaudecode/kapphelper
#   ./bootstrap.sh
#
# Idempotent — safe to re-run. Does NOT install claude, docker, or git; verifies they exist.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PARENT_DIR="$(dirname "$REPO_DIR")"

echo "▶ kapphelper bootstrap"
echo "  repo:   $REPO_DIR"
echo "  parent: $PARENT_DIR"
echo

# ── 1. Verify parent folder is ~/klaudecode per Ken's convention ─────────────
expected_parent="$HOME/klaudecode"
if [[ "$PARENT_DIR" != "$expected_parent" ]]; then
  echo "⚠️  Parent folder is '$PARENT_DIR', expected '$expected_parent'."
  echo "   Ken's rule: Claude memory lives in ~/klaudecode/. Move the repo:"
  echo "     mkdir -p ~/klaudecode && mv '$REPO_DIR' ~/klaudecode/kapphelper"
  echo
fi

# ── 2. Check required tools ──────────────────────────────────────────────────
missing=()
for tool in git docker; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    missing+=("$tool")
  fi
done

# docker compose can be v1 (`docker-compose`) or v2 plugin (`docker compose`)
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  missing+=("docker-compose")
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "❌ Missing tools: ${missing[*]}"
  echo "   Install them, then re-run this script."
  exit 1
fi
echo "✓ git, docker, docker compose present"

# ── 3. Check claude CLI (soft — don't fail if missing) ───────────────────────
if command -v claude >/dev/null 2>&1; then
  echo "✓ claude CLI present ($(claude --version 2>/dev/null || echo 'version unknown'))"
else
  echo "⚠️  claude CLI not found — install per your Claude Code onboarding."
fi

# ── 4. Verify we're in a git checkout ────────────────────────────────────────
if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "❌ $REPO_DIR is not a git checkout. Clone via:"
  echo "     git clone <kairos/kapphelper> ~/klaudecode/kapphelper"
  exit 1
fi
echo "✓ git checkout OK ($(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD))"

# ── 5. Pull latest ───────────────────────────────────────────────────────────
echo "▶ git pull --ff-only"
git -C "$REPO_DIR" pull --ff-only

# ── 6. Create runtime folders (gitignored) ───────────────────────────────────
mkdir -p "$REPO_DIR/artifacts" "$REPO_DIR/logs"
echo "✓ runtime folders ready (artifacts/, logs/)"

# ── 7. .env presence check ───────────────────────────────────────────────────
if [[ -f "$REPO_DIR/.env" ]]; then
  echo "✓ .env present"
elif [[ -f "$REPO_DIR/.env.example" ]]; then
  echo "⚠️  .env not found — copy .env.example and fill in real values:"
  echo "     cp $REPO_DIR/.env.example $REPO_DIR/.env"
else
  echo "  (no .env.example yet — will be added when a skill first needs secrets)"
fi

# ── 8. Sanity — list registered projects ─────────────────────────────────────
if [[ -f "$REPO_DIR/projects.yaml" ]]; then
  echo
  echo "▶ Registered in projects.yaml:"
  grep -E "^  [a-z_-]+:" "$REPO_DIR/projects.yaml" | sed 's/^/  /' || true
fi

echo
echo "✓ bootstrap done."
echo "  Next: start a claude session here — the session-start skill will run automatically."
