#!/usr/bin/env bash
# bootstrap.sh — one-time setup for kapphelper on a Linux or macOS host
#
# Usage:
#   cd ~/klaudecode/kapphelper
#   ./bootstrap.sh
#
# Idempotent — safe to re-run. Does NOT install claude, docker, or git; verifies they exist.
# Docker is only needed on hosts that run docker-based deploys (see projects.yaml) — a
# mobile-build-only Mac (Xcode/fastlane, no containers) is expected to be missing it.

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
# git is hard-required everywhere. docker/docker-compose are only required on
# hosts that actually run docker-based deploys — soft-warn instead of failing,
# so a mobile-build-only Mac (Xcode/fastlane) can still bootstrap cleanly.
if ! command -v git >/dev/null 2>&1; then
  echo "❌ Missing tool: git"
  echo "   Install it, then re-run this script."
  exit 1
fi
echo "✓ git present"

docker_missing=()
for tool in docker; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    docker_missing+=("$tool")
  fi
done
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  docker_missing+=("docker-compose")
fi

if [[ ${#docker_missing[@]} -gt 0 ]]; then
  echo "⚠️  Docker not found (${docker_missing[*]}) — fine if this host only does mobile"
  echo "   builds or other non-docker work; skills targeting a docker deploy (see"
  echo "   projects.yaml deploy.type: docker) won't work here until it's installed."
else
  echo "✓ docker, docker compose present"
fi

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
