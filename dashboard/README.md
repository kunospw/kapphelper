# KAppHelper Developer Dashboard

Read-first internal portfolio dashboard for Kairos custom-app work. It is not a
source of truth &mdash; it renders a Firestore-published snapshot of KAppHelper
records for a 15-minute status meeting and quick project resumption.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for the current
rollout phases, completed capabilities, and the next hosting task.

## Run locally or on the Claude server

From the `dashboard/` folder:

```bash
npm install
npm run dev
```

Vite prints the local URL on start (default `http://localhost:5173`).

Create a production bundle with:

```bash
npm run build
```

Preview the built bundle with `npm run preview`.

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

- GitHub sign-in, Firestore member-gated reads, local Git activity, GitHub App
  activity, and read-only Tai Sin Plane work-item sync are implemented.
- SharePoint/documentation ingestion, scheduled refresh, and evidence-based AI
  recommendations are planned next; see the implementation plan above.
- Any deploy, build, store upload, database mutation, or Plane mutation flow
  remains deliberately outside the dashboard.

## Code layout

```
dashboard/
  data/portfolio.json      # Static snapshot (hand-maintained)
  src/
    App.jsx                # Shell + view routing + loading/error states
    main.jsx               # React root
    styles.css             # Design tokens + component styles
    hooks/
      usePortfolio.js      # Snapshot loader, shaped like a future async adapter
    lib/
      status.js            # Status buckets + tone mapping
      freshness.js         # Date -> age + tone + label
      meeting.js           # Meeting-row derivation (never invents facts)
    components/
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

## Local admin key and initial publish

The dashboard itself uses Firebase Authentication and Firestore's browser
rules. It never receives an Admin SDK credential. A local admin script instead
publishes the first approved portfolio snapshot.

Put the Firebase service-account JSON in this **non-repository** folder:

```text
D:\Dee's archivest\projects\Kairos\kapphelper-dashboard-local-secrets\kapphelper-dashboard-admin.json
```

Then run:

```bash
npm run publish:firestore
```

The key can alternatively live elsewhere by setting
`FIREBASE_SERVICE_ACCOUNT_PATH`. Never commit the key, copy it to client app
servers, or put it in SharePoint.

## GitHub read-only sync

The dashboard can merge sanitized commit and open-PR summaries from GitHub Apps.
The sync runs on the Claude/server host; the browser never receives the GitHub
App private key or installation token.

1. Copy `.env.sync.example` to a local-only `.env.sync` and set the GitHub App private-key path.
2. Keep the Firebase Admin key in the local-secrets folder above.
3. Run `npm run sync:github` from this folder.

The sync writes a sanitized commit/open-PR summary to Firestore. It contains no
tokens, repository files, or private key material.

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
time, SHA, and first-line commit message to Firestore.

## Plane read-only sync

Put a Plane personal-access token in the local secrets folder as
`plane-readonly.token`, then run `npm run sync:plane`. The configured sync
performs GET requests only for KAIROSTSAP work items and publishes a sanitized
summary (status, assignee, priority, target date, and update time) to Firestore.

## Safety

- No `.env`, tokens, keys, keystores, passwords, or connection strings are
  loaded, displayed, indexed, cached, or committed.
- No deploy, database, store-upload, or Plane mutation actions exist.
- AI recommendations remain unbuilt until they can cite evidence and freshness.
