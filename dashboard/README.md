# KAppHelper Developer Dashboard

Read-first internal portfolio dashboard for Kairos custom-app work. It is not a
source of truth &mdash; it renders a Postgres-published snapshot of KAppHelper
records for a 15-minute status meeting and quick project resumption.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for the current
rollout phases, completed capabilities, and the next hosting task.

**Migrated off Firebase to PostgreSQL + JWT auth on 2026-09-16** — see
`apps/kapphelper/APP.md` in the repo root for why, and
`memory/project_kapphelper-dashboard-requirements.md` for Ken's original ask.

## Run locally

From the `dashboard/` folder, one-time setup:

```bash
cp .env.server.example .env.server   # then edit JWT_SECRET to a real random value
docker compose up -d                 # starts Postgres on localhost:5433
npm install
npm run db:generate
npm run db:migrate
npm run add-dev-user -- "you@kairossolutions.co" "Your Name"   # prints a one-time password
```

Then, in two terminals:

```bash
npm run server   # Express API on :4175
npm run dev      # Vite dev server, default :5173 (or :4174/:4173 per the redesign — see AGENTS notes)
```

Create a production bundle of the frontend with:

```bash
npm run build
```

Preview the built bundle with `npm run preview`. The Express API (`npm run server`) is a separate
process — `vite preview` only serves the static frontend.

## Views

- **Team meeting** (default). Grouped by health &mdash; Blocked, At risk /
  needs verification, On track, Paused &mdash; with counts, filter chips,
  freshness badges on each row, and a clear "next action" column. Nothing is
  inferred: if a fact is missing the row says so.
- **Portfolio.** Every project as a card with client, kind, status, next step,
  and last-confirmed freshness.
- **Project detail.** Full context, release safety facts, risks, source
  records, and recommended next work &mdash; each recommendation cites the
  underlying record.
- **Data sources.** Explicit list of the systems this dashboard will
  eventually read from (Plane, SharePoint, Git, AI briefs) and their current
  wiring status. Everything except the KAppHelper snapshot is "Not connected".

## Source-of-truth boundaries

The dashboard reads from these systems and never becomes an alternate source:

| System | Owns |
|---|---|
| Plane | Active issues, priorities, assignments, work status. |
| KAppHelper Git | Project cards, decisions, handovers, release profiles. |
| SharePoint | Meeting notes, onboarding, test artefacts, reference docs. |
| Dashboard | Read-friendly view, freshness signals, source citations. |

## Freshness

Every row/card shows how long ago its "last confirmed" date was. Colour tones:

- **Fresh** &mdash; within 3 days.
- **Aging** &mdash; 4 to 10 days.
- **Stale** &mdash; more than 10 days.
- **Date unknown** &mdash; no confirmation date on record.

Stale does not mean stalled; it means the record has not been re-verified.

## Current limits and next capabilities

- Registered-dev-email login (JWT), Postgres-backed reads, local Git activity,
  GitHub App activity, and read-only Tai Sin Plane work-item sync are implemented.
- SharePoint/documentation ingestion, scheduled refresh, and evidence-based AI
  recommendations are planned next; see the implementation plan above.
- Any deploy, build, store upload, database mutation, or Plane mutation flow
  remains deliberately outside the dashboard.

## Code layout

```
dashboard/
  docker-compose.yml       # Local Postgres for dev
  data/portfolio.json      # Static snapshot (hand-maintained)
  server/
    prisma/schema.prisma   # Postgres schema (Developer, DevUser, Project, Activity, Action, ...)
    src/
      index.js             # Express app: mounts /api/auth, /api/portfolio, /api/sync-status
      db.js                # Shared Prisma client (also imported by scripts/)
      auth/                # hash.js, jwt.js, middleware.js
      routes/               # auth.js, portfolio.js
  scripts/
    add-dev-user.mjs       # CLI to register a login (email + generated/given password)
    publish-portfolio.mjs  # data/portfolio.json -> Postgres (replaces publish-firestore.mjs)
    sync-local-git.mjs / sync-github.mjs / sync-plane.mjs   # raw commit/PR/work-item sync
    merge-activity.mjs     # matches synced commits/work-items to a Developer, server-side
  src/
    App.jsx                # Shell + view routing + loading/error states
    main.jsx               # React root
    styles.css             # Design tokens + component styles
    hooks/
      useAuth.js           # JWT session state machine
      usePortfolio.js      # Calls /api/portfolio + /api/sync-status
    lib/
      api.js                # fetch wrapper, token storage, silent refresh
      status.js            # Status buckets + tone mapping
      freshness.js         # Date -> age + tone + label
      meeting.js           # Meeting-row derivation (never invents facts)
    components/
      AuthGate.jsx          # Email/password login form
      Sidebar.jsx
      TopBar.jsx
      MeetingView.jsx
      PortfolioView.jsx
      ProjectDetail.jsx
      IntegrationsView.jsx
      primitives.jsx       # Status, Fact, Stat, FreshnessBadge, Empty/Loading/Error
```

## Data maintenance

`dashboard/data/portfolio.json` is an MVP seed. When a fact changes, update
the owning KAppHelper record first (`projects.yaml`, an `apps/<slug>/APP.md`,
a capture file, or a `docs/intake/*.md`), then refresh this JSON. Phase 0/1
will replace manual refresh with a verified registry adapter.

## Registering dev logins and initial publish

There is no self-service sign-up. An admin registers each dev's login and
publishes the hand-maintained portfolio into Postgres from the command line —
the browser never receives database credentials.

```bash
npm run add-dev-user -- "dev@kairossolutions.co" "Full Name" "Role · Focus"
npm run publish:portfolio
```

`add-dev-user` prints a one-time generated password if you don't pass one —
relay it to the dev out of band; it is hashed on write and not stored in
plaintext anywhere. `DATABASE_URL`/`JWT_SECRET` live in `.env.server`
(gitignored) — never commit them, copy them to client app servers, or put
them in SharePoint.

## GitHub read-only sync

The dashboard can merge sanitized commit and open-PR summaries from GitHub Apps.
The sync runs on the Claude/server host; the browser never receives the GitHub
App private key or installation token.

1. Copy `.env.sync.example` to a local-only `.env.sync` and set the GitHub App private-key path.
2. Keep `.env.server` (`DATABASE_URL`) set up as above.
3. Run `npm run sync:github` from this folder.

The sync writes a sanitized commit/open-PR summary into the `GithubCommit`/
`GithubPullRequest` Postgres tables. It contains no tokens, repository files,
or private key material. Run `npm run merge:activity` afterward to fold new
commits into each developer's activity feed.

## Local Git log sync for organization repositories

If an organization does not approve API tokens or GitHub App installation, the
dashboard can read commit metadata from a local, blobless mirror using the
developer's normal SSH repository access. Create the mirror once (this does
not check out application files):

```powershell
git clone --filter=blob:none --no-checkout --depth=100 --branch phase-2-build git@github.com:Kairos-Business-Solutions/KairosTSApp.git "D:\Dee's archivest\projects\Kairos\kapphelper-local-mirrors\KairosTSApp"
```

Then run `npm run sync:tsapp-git`. The command fetches the selected branch,
reads the latest 30 commit headers with `git log`, and writes only author,
time, SHA, and first-line commit message into `GithubCommit`. Run
`npm run merge:activity` afterward.

## Plane read-only sync

Put a Plane personal-access token in the local secrets folder as
`plane-readonly.token`, then run `npm run sync:plane`. The configured sync
performs GET requests only for KAIROSTSAP work items and writes a sanitized
summary (status, assignee, priority, target date, and update time) into the
`PlaneWorkItem` table. Run `npm run merge:activity` afterward.

## Safety

- No `.env`, tokens, keys, keystores, passwords, or connection strings are
  loaded, displayed, indexed, cached, or committed.
- No deploy, database, store-upload, or Plane mutation actions exist.
- AI recommendations remain unbuilt until they can cite evidence and freshness.
