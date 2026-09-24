# KAppHelper Dashboard

**Type:** internal Kairos product (meta — a dashboard about the other Kairos apps)
**Repo:** `kapphelper` (this repo) — subfolder `dashboard/`
**Dev:** Dyah Puspo Rini
**Product owner:** Ken Ho

---

## What it is

An internal developer dashboard / knowledge vault for the Custom Apps team: portfolio + health of
Kairos apps, an action-first "Team Meeting" view, developer activity sourced from Git commits and
Plane work items, verified project context/blockers/next actions, and (planned) server-side AI
summaries. It must stay read-only for anything risky — builds, pushes, deploys, store uploads, and
DB changes remain manual, done by developers themselves.

React + Vite frontend, talking to a small Express API (`dashboard/server/`) backed by
**PostgreSQL** via Prisma (migrated off Firebase 2026-09-16 — Postgres fits the rest of the Kairos
stack better, and self-hosting matches Ken's "host it on our own server" requirement more directly
than a separate Firebase project). Login is JWT-based, restricted to pre-registered developer
emails (`DevUser` table) — no OAuth, no self-service sign-up; an admin registers a dev with
`npm run add-dev-user -- email name`. Sync scripts (`scripts/sync-*.mjs`) write directly to
Postgres — never in the browser. Local Postgres runs via `docker-compose.yml`; secrets
(`DATABASE_URL`, `JWT_SECRET`, etc.) live in `.env.server` (gitignored), still outside git the same
way Firebase's service-account JSON used to. See `docs/IMPLEMENTATION_PLAN.md` and the Postgres
migration plan captured 2026-09-16 for the full schema/rollout.

## Why it matters (Ken's ask, 2026-09-09 / 2026-09-11)

Ken raised this unprompted in the 9 Sept standup: he wants to see project status "in one view"
instead of scattered across Plane, and know quickly whether the team is on track — without needing
every detail in the standing meeting. Dyah had already been building something like this
(independently inspired by `KEpicorHelper`); Ken's 11 Sept feedback shaped the concrete
requirements. Full detail: kapphelper `memory/project_kapphelper-dashboard-requirements.md`. In
short: automate the git/Plane/doc sync (currently manual), add a "next milestone" field per project
(not just history), host it access-controlled on an existing app server, and keep the meeting view
terse — detail on demand, not walls of text.

## Current phase

- Baseline dashboard committed (`fd6072b feat: add KAppHelper developer dashboard`).
- A redesign is in progress based on a static prototype at
  `C:\Users\dyahr\Downloads\KAppHelper Dashboard redesign\` (prototype has fake data/auth — do not
  copy blindly). Direction: corporate-red header, white sidebar, action-first Team Meeting page
  with filters (All / Blocked / Needs verification / Open next actions), inline expandable
  evidence, collapsible project-health context, compact "People represented" cards.
- In-progress files: `dashboard/src/components/MeetingView.jsx`, `dashboard/src/styles.css` —
  uncommitted, not yet reviewed with Dyah for sign-off.
- Old layout still runs on `:4173`; redesign dev server on `:4174`.
- Git activity sync currently uses local git-log (`npm run sync:tsapp-git`) against the
  `KairosTSApp` checkout — the Kairos GitHub App route isn't usable yet (personal GitHub App not
  approved/installed for the org, and Dyah isn't an org owner).
- Plane sync (`npm run sync:plane`) is working, publishes ~100 work items from the "Kairos Invoice
  Portal" project. A temporary filter hides items updated "today" for presentation purposes — flagged
  to revisit, not permanent policy.
- **2026-09-16 — migrated off Firebase to PostgreSQL + JWT auth.** Backend now lives in
  `dashboard/server/` (Express + Prisma). Sync scripts write to Postgres directly; a new
  `scripts/merge-activity.mjs` does the commit/work-item → developer matching server-side (used to
  run in the browser on every page load via `githubActivity.js`/`planeActivity.js`, now deleted).
  `npm run publish:portfolio` replaces `publish:firestore`. Not yet verified end-to-end locally —
  `npm install` completed but `prisma generate`/`migrate` could not be run in the session that did
  this migration because the machine's C: drive was completely full (0 bytes free) — **next session
  should free disk space, then run `npm run db:generate && npm run db:migrate` before anything
  else.**

## Known next work

1. **Free disk space on C:, then run `npm run db:generate`, `docker compose up -d`, and
   `npm run db:migrate` in `dashboard/`** — blocks everything else below; see the 2026-09-16 phase
   note above.
2. Seed the first registered dev logins with `npm run add-dev-user -- email name`, then verify
   login end-to-end (`npm run server` + `npm run dev`).
3. Run `publish:portfolio`, the three `sync:*` scripts, and `merge:activity` against real data and
   compare the dashboard's rendering to what it showed on Firebase, to confirm the merge ported
   correctly.
4. Finish + visually validate the redesign against the prototype; get Dyah's sign-off before commit.
5. Decide whether to retain/remove the legacy `DeveloperProgressView`.
6. Automate the sync/merge/publish scripts on a schedule (Ken's ask — currently all manual).
7. Add a "next milestone" field per project, not just historical activity.
8. Choose and set up a real hosting target (access-restricted to Kairos emails) — not yet decided;
   Ken suggested starting on an existing app server (e.g. the TS app box) on a separate port. Once
   chosen, register it in `projects.yaml` `apps.kapphelper.deploy` (currently `type: none`).
9. Documentation ingestion/status, without exposing client files or secrets.
10. Server-side Ollama/DeepSeek summary service once Ken supplies API details — never called
    directly from the browser; key stored server-side only. `server/src/index.js` already has a
    comment marking where this route mounts.
11. Replace the "hide today's Plane items" presentation hack with a user-controlled date filter.

## Deploy

Per `../../projects.yaml` `apps.kapphelper.deploy` — no deploy target chosen yet (`type: none`).
Local dev: `docker compose up -d` (Postgres) + `npm run server` (API, port 4175) + `npm run dev`
(Vite, port 4174) in `dashboard/`. See open item 8 above for the real hosting target.

## Capture (append-only)

Team meeting decisions/requirements about the dashboard itself → new file in `capture/` per the
format in the root `CLAUDE.md`. Cross-session durable requirements already summarized in
kapphelper `memory/project_kapphelper-dashboard-requirements.md` — update that memory if it goes
stale, and add captures here for new dated events.

## Open questions / active threads

- Final hosting target + subdomain/port not yet decided.
- Whether Praisilia's independent "combined AI summary" doc (mentioned 9 Sept) should be folded
  into this dashboard or stays a separate manual artifact.
- How to expose (or deliberately not expose) prototype/MVP-only apps like KFMS and KPortal
  Supplier if this dashboard is ever shown to non-engineering stakeholders (Eileen/marketing) —
  see Ken's vaporware/proprietary-IP caution in the dashboard requirements memory.

_(Add to this section as new questions arise; move to a capture file when resolved.)_
