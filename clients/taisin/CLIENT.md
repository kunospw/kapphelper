# Tai Sin Enterprise (LKHE company)

**Type:** external client
**Repo:** `KairosTSApp` — `.NET 8 OrchestratorService.Api` + `Next.js 15` frontend, branch `phase-2-build`
**Client PM:** Iwan (Group IT)
**Product owner:** Ken Ho
**Active dev:** Dyah Puspo Rini

---

## What it is

Invoice-delivery automation: pulls invoice data from Epicor, generates PDF packages, uploads to
Google Drive, emails each customer per their configured delivery preference (email / portal / post /
by-hand / CSE). Six Tai Sin group companies share one Epicor tenant: LKHE, LKHP, LKHPD, TSPD, EG,
TSE — see `projects.yaml` `clients.taisin.companies`.

Two parallel Docker stacks run on the same host (`cloud2.kairossolutions.co` / `kairostsapp`,
SSH alias `tsapp`): **Pilot** (`tsapp-pilot.ksol.ai`, ports 3000/5000) for testing, **Live**
(`tsapp.ksol.ai`, ports 3001/5001) for production. Separate DBs, separate secrets — never share
volumes between them.

## Current phase (as of 2026-08-14)

**Go-live targeted 1 September 2026.** LKHE users first; LKHP onboarding is explicitly gated on
per-company data isolation actually working (Iwan, 6 Aug meeting — see
`capture/2026-08-13_iwan_company-access-model.md`).

Two major workstreams landed this session, both on Pilot, **Live not yet rebuilt since the first of
them**:

- **Track A — per-company user access control** (KAIROSTSAP-87). Full three-tier model
  (user/company-admin/superadmin) built end-to-end: `CompUser` table, authorization checks wired
  into ~25 data-plane endpoints across 6 controllers, admin UI to assign users to companies (with
  company-admin-scoped access to that UI, not just superadmin), invoices-page dropdown now follows
  real assignment. **Verified with real test-account logins on Pilot** — see capture for the model,
  `KairosTSApp/CHANGELOG.md` for full build detail.
- **Password management** — there was no way to change a password anywhere in the system (not even
  for a superadmin to unblock someone). Phase 1 built: forced-change nudge on admin-set passwords
  (a dismissible modal, not a hard block — softened after real-account testing showed the original
  force-redirect was disproportionate), admin reset (both superadmin and company-admin scoped).
  Phase 2 (self-service forgot-password) is blocked on an open question: which mailbox sends the
  reset email — ask before building. Full plan: `KairosTSApp/docs/password-management-plan.md`.
- **Track B — per-company Epicor server routing** (KAIROSTSAP-51) also landed this session
  (commit `cb1a0ac`) — the previously write-only "Epicor Configuration" admin tab is now live.
  **Not yet deployed/tested on Pilot as of this write-up** — touches live invoice generation, needs
  careful verification before going near Live.

## Where the source-of-truth docs live

Deliberately **not duplicated into kapphelper** — this session's work is documented in the app repo
itself, which is where a `.NET`/`Next.js` dev will actually look:

- `KairosTSApp/CHANGELOG.md` — dated, per-commit changelog (Keep a Changelog format)
- `KairosTSApp/.klaudecode/phase2_tracker.md` — living tracker, per-item status + dated log
- `KairosTSApp/docs/password-management-plan.md` — password mgmt decisions (D1-D5) + build guide
- `KairosTSApp/docs/session-handover-2026-08-14.md` — narrative session handover, written mid-session
- External plan file (not in either repo): `/home/drini/klaudecode/epicor-config-e2e-plan.md` — the
  cross-session working plan Dyah copies to her local machine

kapphelper holds the durable, cross-session-relevant *decisions* and *lessons* (this file, the
capture above, `memory/feedback_*`), not a mirror of the app repo's own docs.

## Deploy

Per `../../projects.yaml` `clients.taisin.deploys` — two stacks, `mode: advisory` (drini is not in
the `docker` group on this host; sudo needs a password Claude can't type non-interactively). Claude
prepares the exact command, user runs it in their own SSH terminal.

## Known gaps / open threads (as of 2026-08-14)

- Live hasn't been rebuilt since the Track A work started — everything past A1 is Pilot-only.
- Track B (Epicor routing) needs real Pilot verification (Test Connection button + an actual
  invoice regeneration), not just a clean build, before it's trusted.
- Reset-password UI exists for superadmin; company-admin-scoped reset has no UI yet (endpoint
  exists, API/Swagger only).
- D5 open: which mailbox sends password-reset emails — needed before Phase 2 self-service reset.
- KAIROSTSAP-87's Plane priority ("medium, gates KHP phase, not first go-live") looks outdated given
  Iwan raised it as a pre-go-live blocker — worth re-raising with Ken.
- B1 (consolidating six different Epicor credential-loading fallback orders across files) — flagged
  as worth doing before go-live, not yet attempted.

## Capture (append-only)

Client conversations, Iwan/Ken decisions, screenshots → new file in `capture/` per the format in the
root `CLAUDE.md`. Never edit a past capture — write a new one that supersedes.
