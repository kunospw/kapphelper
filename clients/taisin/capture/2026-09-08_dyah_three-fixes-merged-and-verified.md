---
date: 2026-09-08
source: session
from: Dyah
type: decision
about: Drive-ID Phase 2 + Epicor Web Service license fix + superadmin creation — merged, rebuilt, verified
plane: —
status: confirmed
---

## What

Three independent fixes, built separately this session on their own branches off `phase-2-build`,
were merged together into `phase-2-build` and rebuilt on the `tsapp` host:

1. **Drive folder-ID DB-source-of-truth** (commit `b3789cd`) — see
   [[2026-09-08_dyah_po-archiving-phase1-verified-phase2-built]] for the original writeup.
2. **Epicor Web Service license claim** (commit `a40194f`) — see
   [[2026-09-08_dyah_epicor-webservice-license-fix]].
3. **Superadmin can create superadmin** (commit `3b72c61`) — see
   [[2026-09-08_dyah_superadmin-creation-fix]].

Also carried along: Dyah's own intentional `GoogleDrive__IsTestMode=false` change on Pilot
(commit `993d2f0`), confirmed intentional — Pilot has been testing against real per-invoice Drive
folders, not the test folder, all this week ahead of Live go-live.

Merge order: `phase2-drive-id-source-of-truth` (fast-forward) → `epicor-webservice-license-fix`
(auto-merged, one conflict on `docker-compose.yml` against Dyah's uncommitted
`GoogleDrive__IsTestMode` line, resolved by committing that line first) →
`superadmin-create-superadmin` (clean). `dotnet build`: 0 errors, same 32 pre-existing warnings.
`dotnet test`: 5/5 pass, both before and after all three were combined.

Rebuild was blocked twice by the host running out of disk — see
[[2026-09-08_dyah_kairostsapp-disk-full-incident]] — resolved by Dyah freeing space in her own
sudo session, then `sudo docker compose up -d --build`.

## Why

All three were independently reviewed and approved by Dyah before merging; bundling them into one
rebuild was Dyah's call once all three were ready, rather than three separate rebuild cycles.

## Impact

- **`phase-2-build` now includes all three fixes plus the IsTestMode change — rebuilt and
  confirmed working on both Pilot and Live** (Dyah, 2026-09-08, same day as the merge).
- Supersedes the "awaiting Dyah's own rebuild + Pilot verification" status in
  [[2026-09-08_dyah_po-archiving-phase1-verified-phase2-built]] for the Drive-ID fix specifically
  — that fix is now verified, not just pushed.
- `phase-2-build` local HEAD is 6 commits ahead of `origin/phase-2-build` as of this session
  (not yet pushed to GitHub — worth checking before the next session starts elsewhere).
