# KDocVerify

**Type:** internal Kairos product
**Repo:** `KConnectApp` (monorepo) — sub-modules `services/docverify-api` + `portals/docverify`
**Devs:** Dyah Puspo Rini, Jesynta Harya (both software dev interns; currently Jesynta active per Ken's 2026-08-12 assignment)
**Product owner:** Ken Ho

---

## What it is

Document approval portal — package submission → configurable routing → approve/reject with role
enforcement → final status. Currently lives inside the KConnectApp platform and shares its
Postgres, Redis, and MinIO stack.

## Why it matters (Ken's vision, 2026-08-12)

Not just another e-signature / doc-approval app. The bar is to **make it market-differentiated**
so it can be sold beyond internal use. Directions Ken called out:

- **QR-based verification** — latest QR standards for signing/verification
- **Cryptographic signing** — provable, tamper-evident approvals
- **Blockchain-backed audit trail** — the kind of feature "other apps haven't thought about yet"

That vision is the north star; short-term work is stabilising the core so the differentiation has
a solid base to sit on.

## Tenants (multi-tenant model)

KDocVerify is designed multi-tenant — one deployment serves many customers, each isolated by
`tenant_id` on every row (see `KConnectApp/docs/CLAUDE.md` §4).

Named tenants:
- **Caterlink** — first tenant, seeded in Phase 2 role migration (`006_phase2_roles.sql`)

Test credentials for known tenants are documented externally (see `projects.yaml` `meta.credentials_ref`) — never in this repo.

## Current phase

Per `KConnectApp/docs/KDocVerify_Enterprise_Readiness_Plan.md` (Dyah, 2026-06-12):

- **Phase 1** — Workflow integrity fixes — ✅ done (2026-06-12)
- **Phase 2** — Role separation + permission enforcement — ✅ code complete (2026-06-16),
  substantially retested (2026-06-17); buyer-side UAT still open
- **Phase 3** — Documents module completion — 🟡 next
- **Phase 4 / 5** — external integration surface, differentiation features — 🔜

Two carry-overs from Phase 2 retest folded into Phase 3:
- Documents module not covered by role model (upload guarded only by JWT + tenant scope)
- Role-constant inconsistency: `startWorkflow` uses `USER_ROLES` (excludes `buyer`/`approver`)

## Deploy

Per `../../projects.yaml`:
- Target: `local` on `kconnect01` (Jesynta runs Claude on that host)
- Path: `/opt/kconnect`
- Services: `docverify-api` (:5000), `docverify-frontend` (:3003)
- Public: `https://kdocverify.ksol.ai`, API `https://api.kdocverify.ksol.ai`

Server rule (Ken, 2026-08-12): Claude has no sudo — docker compose in the project folder is the
ceiling. System-level ops go through Ken.

## Where the source-of-truth docs live

- **Enterprise Readiness Plan** — `KConnectApp/docs/KDocVerify_Enterprise_Readiness_Plan.md`
  (Dyah's phased plan with UAT modules; the definitive backlog document)
- **Master platform context** — `KConnectApp/docs/CLAUDE.md` (multi-tenancy, stack rules,
  Epicor patterns — applies platform-wide, not just to DocVerify)
- **Baseline copies** — `baseline/` in this folder (frozen snapshots at planning time)

## Baseline (frozen)

Put the versioned Enterprise Readiness Plan and any client-facing scope docs under `baseline/`
as they are — this is the "as-signed" record. Never edit; if the plan changes, add a new dated
copy alongside the old one.

## Capture (append-only)

Meetings, WhatsApp screenshots, Ken decisions, UAT feedback → new file in `capture/` with the
format described in the root `CLAUDE.md`. Never edit a past capture — write a new one that
supersedes.

## Open questions / active threads

- Buyer-side UAT retest for Phase 2 (needs a buyer login)
- Sign-out confirmation modal (7.7 fail → Phase 3 cleanup item 3.7)
- How the differentiation features (QR / crypto / blockchain) sequence against Phase 3+4 —
  decision pending

_(Add to this section as new questions arise; move to a capture file when resolved.)_
