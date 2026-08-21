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

## Current phase (as of 2026-08-21)

**Go-live targeted 1 September 2026.** LKHE users first; LKHP onboarding is explicitly gated on
per-company data isolation actually working (Iwan, 6 Aug meeting — see
`capture/2026-08-13_iwan_company-access-model.md`).

**Both Pilot and Live now run the same code** — Live was rebuilt 2026-08-19/20 after sitting ~3
weeks (100 commits) behind, catching it up on everything below. Before rebuilding, checked the
actual prerequisites rather than assuming: Live's `Comps` table was clean (no stale credential
data), the Google service account is identical to Pilot's (no separate Drive permission grant
needed), and Track A's `UnassignedUsersSeeAllCompanies=true` fallback confirmed real Live users
(Stella/Zexuan/David/Carol) wouldn't get locked out on deploy. Migration, sync loop, and
credential-source logging all confirmed clean post-rebuild.

Workstreams landed since the 14 Aug write-up:

- **Track A — per-company user access control** (KAIROSTSAP-87). Full three-tier model
  (user/company-admin/superadmin), `CompUser` table, authorization across ~25 data-plane endpoints,
  admin UI to assign users to companies. **Verified on Pilot, now deployed to Live too** — but
  Live's `CompUsers` table is still empty (no lockout risk thanks to the fallback above, but the
  restriction isn't actually *active* on Live yet). Replicating Pilot's assignments
  (Zexuan/Carol→LKHE, David→LKHP, Stella→both as admin) on Live is still an open task.
- **Password management Phase 1** — forced-change modal + admin reset, done. Phase 2
  (self-service forgot-password) still blocked on which mailbox sends the reset email.
- **Track B — per-company Epicor server routing** (KAIROSTSAP-51) — verified on Pilot with a real
  Test Connection + invoice regeneration.
- **Epicor credentials in the database** (KAIROSTSAP-51/75, decisions E1–E8 in
  `docs/epicor-credentials-plan.md`) — a full reversal of the earlier "keep credentials in env vars
  only" stance, deliberately: Iwan (superadmin) needs to manage these himself without SSH access.
  Built with real safeguards: AES-256-GCM encryption at rest, Test-Connection-must-pass-before-save,
  401 detection that stops the sync loop instead of retrying into a lockout, audit logging on every
  change. LKHE's real credentials are live, encrypted, verified surviving a container restart and a
  real invoice generation. **A same-day incident** (stale placeholder data in one `Comp` row broke
  sync for all 6 companies for ~1h20m on Pilot) produced a durable lesson now in kapphelper memory:
  [[verify-db-state-before-trusting-zero-regression-claims]] — a "this table is blank" claim needs a
  `SELECT`, not an inference from chat history. E9 (rotating the SMTP password committed in
  plaintext in an old memory file) remains explicitly deferred, not resolved.
- **Customer PO — Drive-first** (KAIROSTSAP-94, `docs/po-drive-first-plan.md`) — verified
  end-to-end for **LKHE only**. Strict exact-match lookup (no fuzzy auto-guess on the generation
  path, per Ken's 6 Aug objection), wired into actual invoice merge, audit trail records which
  Drive file was used. The other 5 companies have no Current PO drive set up yet
  (KAIROSTSAP-91 blocker) — and a second drive Iwan did create for LKHE turned out to be the
  *wrong* one (inconsistent naming, not what finance actually uploads to) — confirmed with
  Stella/Ze Xuan before trusting it. Open: a `PO_`-infix filename variant seen in real data isn't
  handled yet (safe failure, not wrong-file risk); the packing-slip question (Ken, 6 Aug) is still
  unanswered.
- **Concurrent-load fix pass** (`docs/epicor-load-plan.md`, KAIROSTSAP-44/67) — root cause of the
  intermittent PDF generation failures (`K_GetRptData did not return a PDF after 24 attempts`): the
  app itself was flooding Epicor with unbounded concurrent BAQ traffic every time anyone browsed
  the invoice list, starving an in-flight report generation. Full Tier 1/1½ checklist done and
  **log-verified** on Pilot — persisted doc-readiness counts (list page now makes zero Epicor calls
  per row), cached customer invoice options, capped concurrent `SubmitToAgent` calls, plain-language
  "Epicor is busy" instead of a raw timeout, and a "Retry these N" batch UI. The plan's own final
  proof (generate while a second session pages a 26,835-row list) reproduced on purpose and held
  clean — 11 `GENERATE_TIMING` lines, zero errors. Found and fixed 3 real bugs along the way
  (T1-A's migration silently never applying, a DbContext-concurrency race in the doc-count refresh,
  and a concurrent-duplicate-generate race that could leave two PDFs in one invoice's Drive folder
  — see [[verify-fix-scope-before-generalizing]] for the lesson from over-correcting that last one).
  **Not yet deployed to Live.**
- **Company-admin-scoped password reset UI** — the backend endpoint existed since Phase 1 but had
  no UI; a company admin like Stella had no way to reset a locked-out user in her own company
  without going through a superadmin. Built + deployed to Pilot.
- **Unassigned-user-access closure** (`docs/unassigned-user-access-plan.md`, KAIROSTSAP-98) — the
  Track A rollout scaffold (`UnassignedUsersSeeAllCompanies=true`) let any unassigned account see
  all six companies; found via a real account (`eileen.daneaya@...`) on Pilot. Built the
  explanatory empty-state screen, audited who'd be locked out (5 accounts, confirmed test/throwaway
  by drini, deliberately left unresolved), and **flipped the flag to `false` on Pilot**. Live is
  explicitly untouched — its `CompUsers` table still has 0 rows, and flipping the same flag there
  before creating real assignments would lock out Stella/Ze Xuan/Carol/David all at once.

## Where the source-of-truth docs live

Deliberately **not duplicated into kapphelper** — this session's work is documented in the app repo
itself, which is where a `.NET`/`Next.js` dev will actually look:

- `KairosTSApp/CHANGELOG.md` — dated, per-commit changelog (Keep a Changelog format)
- `KairosTSApp/.klaudecode/phase2_tracker.md` — living tracker, per-item status + dated log
- `KairosTSApp/docs/password-management-plan.md` — password mgmt decisions (D1-D5) + build guide
- `KairosTSApp/docs/epicor-credentials-plan.md` — credentials-in-DB decisions (E1-E9) + build guide
- `KairosTSApp/docs/po-drive-first-plan.md` — Customer PO Drive-first decisions (P1-P5) + build guide
- `KairosTSApp/docs/incident-2026-08-18-epicor-credentials.md` — the stale-Comp-data incident,
  written same-day while the detail was exact — worth reading before touching credential resolution
  again, not just for the fix but for the "verification has to touch the data" pattern
- `KairosTSApp/docs/session-handover-2026-08-14.md` — narrative session handover, written mid-session
- `KairosTSApp/docs/epicor-load-plan.md` — concurrent-load fix pass, Tier 1/1½ decisions + build guide
- `KairosTSApp/docs/unassigned-user-access-plan.md` — closing the unassigned-user rollout scaffold

kapphelper holds the durable, cross-session-relevant *decisions* and *lessons* (this file, the
capture above, `memory/feedback_*`), not a mirror of the app repo's own docs.

## Deploy

Per `../../projects.yaml` `clients.taisin.deploys` — two stacks, `mode: advisory` (drini is not in
the `docker` group on this host; sudo needs a password Claude can't type non-interactively). Claude
prepares the exact command, user runs it in their own SSH terminal.

## Known gaps / open threads (as of 2026-08-21)

- **Live's `CompUsers` table is still empty — now more urgent.** Track A isn't actively
  restricting anyone there, and unlike Pilot, Live's `UnassignedUsersSeeAllCompanies` flag has
  **not** been flipped (flipping it before assignments exist would lock out Stella/Ze
  Xuan/Carol/David at once). Needs Pilot's assignments replicated, verified, then the flag flipped
  on Live too — see `docs/unassigned-user-access-plan.md`'s Live section for the exact order.
- The full concurrent-load fix pass (`docs/epicor-load-plan.md`) is Pilot-only — Live hasn't been
  rebuilt since this work started, so the original PDF-generation-failure fix isn't in production yet.
- Customer PO Drive-first only works for LKHE — the other 5 companies need their own Current PO
  drives from Iwan (KAIROSTSAP-91), and each one needs its actual contents checked before trusting
  it, not just its existence (see the LKHE second-drive finding above).
- Packing-slip question (Ken, 6 Aug, 5:47) — does the customer PO also need to attach to packing
  slips, not just invoices? Unanswered; if yes, the current Drive-first design doesn't cover it.
- `PO_`-infix filename variant (`CustID_PO_PONum.pdf`, confirmed in real LKHE data) not handled by
  the strict matcher — safe failure (no PO found, not a wrong file), open question whether it's
  common enough to build tolerance for.
- E9 (SMTP password rotation) — deferred, not resolved. Recommended regardless of the rest of the
  credentials plan.
- ~~D5 open: which mailbox sends password-reset emails~~ — **resolved 2026-08-21**: Phase 2
  self-service forgot-password (D4) dropped per Dyah's decision. Admin-reset (D1-D3, already live)
  is the permanent mechanism; D5 is moot. See `KairosTSApp/docs/password-management-plan.md`.
- Two active TSApp git checkouts for Dyah (this server + Windows) already caused one auto-merge
  incident (2026-08-20, resolved cleanly) — see kapphelper `memory/reference_project-checkouts.md`
  and `memory/feedback_notify-before-shared-main-push.md`. Fetch before starting work in either.
  Note: the server checkout's git remote now uses HTTPS + `gh auth` (account `kunospw`), not SSH —
  see `reference_project-checkouts.md`.
- 5 test/throwaway accounts on Pilot now blocked by the unassigned-user gate (deliberately, not a
  bug) — `eileen.daneaya@...`, `dyahrini908@gmail.com`, `info@kairossolutions.co`,
  `ken.ho2@kairossolutions.co`, `user@example.com`. Left unresolved on purpose (drini confirmed
  test accounts); revisit if any of these turn out to be a real login someone needs.

## Capture (append-only)

Client conversations, Iwan/Ken decisions, screenshots → new file in `capture/` per the format in the
root `CLAUDE.md`. Never edit a past capture — write a new one that supersedes.
