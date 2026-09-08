---
date: 2026-09-08
source: session
from: Dyah
type: clarification
about: PO source file archiving (BR120) — Phase 1 verified, Phase 2 built
plane: —
status: confirmed
---

## What

Dyah confirmed Stella has verified **Phase 1** of `docs/po-source-archiving-and-drive-config-plan-2026-09-02.md`
(PO source file archived alongside the invoice, commit `b4de351`) working on Pilot. The confirming
signal Dyah cited: the PO source file "is no longer implementing the test mode for the drive
file" — i.e. it now lands in the real per-invoice working/archive folder chain rather than only
being visible via the test-mode path.

Same session, Claude implemented **Phase 2** of that plan (Google Drive folder-ID resolution made
DB-first — `Comp.GoogleDriveRootFolderId` before `appsettings.json`'s `CompanyToDriveId` — plus a
fail-fast presence check before any Epicor call): branch `phase2-drive-id-source-of-truth`,
commit `b3789cd`, pushed to `origin` on KairosTSApp. Left un-merged into `phase-2-build`
deliberately, per the plan's own sequencing note (verify on Pilot before it rides to Live).

Dyah is taking the next step herself — rebuilding and verifying Phase 2 on Pilot — rather than
having Claude do the rebuild/deploy.

## Why

Phase 1 was client-confirmed (Iwan + Stella, 2 Sept, BR120 PO item) and needed on-Pilot proof
before riding to Live with the next normal deploy — that proof is now in from Stella. Phase 2 is
the internal robustness companion (no client blocker) closing the one inconsistent Drive-ID field
(the same bug class that hit TSE, KAIROSTSAP-116) — worth landing before the remaining four
companies get onboarded, each of which currently needs an appsettings/deploy edit just to get a
working Drive config.

## Impact

- Phase 1 (`b4de351`) can be treated as Pilot-verified going forward — no longer an open item.
- Phase 2 (`b3789cd`, branch `phase2-drive-id-source-of-truth`) is pushed and awaiting Dyah's own
  rebuild + Pilot verification; not yet merged into `phase-2-build`, not yet on Live.
- Next capture/update should record the outcome of Dyah's Pilot verification and the merge into
  `phase-2-build`.
