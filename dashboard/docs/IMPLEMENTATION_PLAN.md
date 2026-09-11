# KAppHelper Dashboard — Implementation Plan

## Purpose

KAppHelper is an internal, read-only team-meeting dashboard for Kairos custom
application work. It combines verified project context, Git activity, Plane
work items, meeting outcomes, and—next—documentation status. It is not a
deployment console, a place for secrets, or a replacement for Plane.

## What is already implemented

- Firebase GitHub sign-in and Firestore member-gated read access.
- Team-meeting, portfolio, and project-detail views.
- Firestore-published project snapshot and meeting updates.
- Read-only GitHub App sync for the personal KAppHelper repository.
- Read-only local Git-log sync for `KairosTSApp`.
- Read-only Plane sync for the Tai Sin project.
- SGT timestamps, developer identity matching, and presentation-safe activity
  filtering.

## Phase 1 — Internal hosted pilot

**Outcome:** approved Kairos users can open one stable internal URL without
access to any source-system credentials.

1. Identify the proposed Tai Sin application server, its existing reverse proxy, and a free
   internal port. Record owner, hostname, port, and rollback method.
2. Build the static React bundle with `npm run build`.
3. Serve only the `dist/` folder through the existing server/reverse proxy.
   Do not copy Firebase Admin, GitHub, Plane, app, database, or client secrets
   to the web server.
4. Add the final hosted domain to Firebase Authentication's authorised domains.
5. Verify: unauthenticated users see the sign-in page; approved members can
   read the dashboard; an unapproved GitHub user cannot read Firestore data.

**Definition of done:** an approved internal user can sign in at the stable
URL and view the same read-only dashboard seen locally.

## Phase 2 — Team onboarding and ownership mapping

**Outcome:** each developer has one accurate meeting card.

1. Add each approved person to `members/<Firebase UID>` with `active: true`.
2. Add their GitHub login and known Plane display-name/email aliases to the
   dashboard developer profile.
3. Confirm which projects each person owns and what their next milestone is.
4. Run one team-meeting dry run and correct misattributed activity.

**Definition of done:** commits and assigned Plane items do not create
duplicate developer profiles; every active project has an owner or an explicit
`Needs verification` state.

## Phase 3 — Source coverage and documentation

**Outcome:** project context is traceable, not dependent on memory.

1. Add the remaining local Git repositories one at a time, starting with the
   active project with the least reliable context.
2. Add a read-only SharePoint/documentation adapter that publishes only title,
   path/link, modified date, owner, and project tag—not document contents or
   credentials.
3. Define a simple project handover template: what changed, evidence, blocker,
   next action, owner, and environment.
4. Link each dashboard action to a Git commit, Plane item, document, or meeting
   record.

**Definition of done:** every meeting action has a source link or is visibly
marked as an unverified gap.

## Phase 4 — Reliable scheduled refresh

**Outcome:** the dashboard is refreshed regularly without putting credentials
in browsers or application servers.

1. Choose one controlled runner: a protected admin workstation or a dedicated
internal utility host—not every client-app server.
2. Store the Firebase Admin and source credentials only in that runner's
protected secret location.
3. Schedule read-only source syncs initially every half day, matching the team
meeting direction. Observe failures before increasing frequency.
4. Publish one combined Firestore snapshot and a sync-run status after each
successful run.
5. Alert the dashboard admin on a failed sync; never silently fabricate a
freshness date.

**Definition of done:** a failed source sync is visible, and the dashboard
always labels the last successful refresh.

## Phase 5 — Evidence-based AI summary

**Outcome:** the dashboard recommends the next work item without inventing
project facts.

1. Generate summaries only from the sanitised Firestore snapshot.
2. Require every recommendation to cite its input source and freshness date.
3. Label AI output as a recommendation, never as a confirmed delivery status.
4. Keep all deploy, store release, database, and Plane write actions outside
the dashboard.

**Definition of done:** recommendations are useful in a meeting and can be
challenged against their cited source records.

## Start here: the next practical task

Start **Phase 1, Step 1**: create a one-page hosting discovery record for the
Tai Sin application server. Collect only these fields from the server owner:

```text
Server hostname / IP:
Existing reverse proxy (Nginx, Caddy, Apache, other):
Safe internal port or subdomain to reserve:
Who approves access and deployment:
How static sites are currently served:
Rollback method:
Proposed internal dashboard URL:
```

Once those are known, the next implementation is a small static-site deployment
configuration. Do not move any sync credential or Firebase Admin key to that
server.
