---
date: 2026-09-08
source: session
from: Dyah
type: issue
about: kairostsapp host ran out of disk mid-rebuild, twice
plane: —
status: confirmed
---

## What

The `tsapp` host (`cloud2.kairossolutions.co:7723`, Linux hostname `kairostsapp`) hit 0 free space
on its single root ext4 volume (`/dev/mapper/ubuntu--vg-ubuntu--lv`) twice in one session, both
mid-`docker compose up -d --build`. First failure: `ResourceExhausted: ... no space left on
device` on the frontend image's `COPY --from=builder /app ./` step, after the orchestrator-api
build context transfer alone measured 2.08GB. Everything on this box — root, `/var/lib/docker`,
all of it — lives on one volume, so a full disk blocks Docker builds AND Claude's own tooling
(bash commands failed with `ENOSPC` writing to their own tmp bookkeeping dir) at the same time.

Likely contributors identified (not fully confirmed which mattered most):
- Docker BuildKit layer cache accumulating across repeated `--build` runs with no periodic prune.
- Stray backup files left in `/opt/KairosTSApp` (`docker-compose.yml.bak-2026-09-03`,
  `docker-compose.live.yml.bak-2026-09-01`).
- Claude sessions creating git worktrees under `.claude/worktrees/` inside the repo and running
  `dotnet build` directly in them (leaves `bin`/`obj` artifacts) — if `.dockerignore` doesn't
  exclude `.claude/worktrees/`, `bin/`, `obj/`, those inflate every build's Docker context too.

Freed by running `docker builder prune -af` / `docker image prune -af` in an interactive sudo
session (Claude's own tooling can't run `sudo` non-interactively per this repo's standing rule).

## Why

Matters because this same host runs **both** Pilot and Live — a full disk isn't just a Pilot
build failure risk, it can affect the running Live containers too (log writes, DB writes).

## Impact

- No permanent fix landed this session — this is a recurring risk, not a one-time cleanup.
- Worth periodically checking `df -h` on `kairostsapp` before a big rebuild, and running `docker
  builder prune` proactively rather than waiting for a failure.
- Worth checking whether `.dockerignore` actually excludes `.claude/worktrees/`, `bin/`, `obj/` —
  not confirmed either way this session.
- The stray `.bak` docker-compose files are still sitting in `/opt/KairosTSApp` — worth deciding
  whether to delete them (Dyah's call, not deleted this session since ownership/purpose wasn't
  confirmed).
