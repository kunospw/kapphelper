# Kairos Developer Dashboard - Project Plan

## Purpose

Build a developer-facing dashboard that gives every Kairos custom-app developer one reliable
place to understand the portfolio, resume work safely, find relevant documentation, and make
better next-step decisions. It complements KAppHelper and Claude on the server; it does not
replace either.

The first safety objective is to prevent a mobile release from being sent to the wrong client,
application, environment, or store distribution lane (for example TCS versus TWPC).

## Source-of-truth boundaries

| System | Owns | Does not own |
|---|---|---|
| Plane | Active issues, assignments, priorities, comments, work status | Durable project context or release configuration |
| KAppHelper Git | Project cards, decisions, handovers, release profiles, durable troubleshooting | Large attachments or a second issue tracker |
| SharePoint | Meeting notes, onboarding material, test artefacts, reference documents | Live project status or secrets |
| Dashboard | Searchable, read-friendly view and approved guided actions | A duplicated database of project facts |

The dashboard reads from these systems and retains source links, timestamps, and provenance. It
must not silently copy credentials, tokens, or private keys from any source.

## Product principles

- **Explicit over inferred.** Client, environment, API URL, branch, bundle/package ID, and
  distribution lane are selected data, never guessed from a project name or a chat.
- **Evidence before summaries.** Every AI summary and recommendation names its input sources and
  their last-updated times.
- **Human approval for mutations.** Claude or the dashboard may prepare a Plane update, issue,
  release command, or deploy plan, but a developer reviews and executes/approves it.
- **One write path per fact.** A status belongs in Plane; a durable decision belongs in KAppHelper;
  a source document stays in SharePoint.
- **Useful without AI.** Navigation, project status, release profiles, and keyword search must
  work even if an AI provider is unavailable or rate-limited.
- **Meeting-first, detail-on-demand.** The first view answers whether work is on track, late,
  blocked, or unowned. Detailed captures are one click away, not the default meeting content.
- **Internal by default.** Client data, delivery risks, and proprietary implementation detail stay
  in the authenticated operations view. Any marketing/LinkedIn output is a separately reviewed,
  intentionally limited summary.

## Phases

### Phase 0 - Establish the data contract (1-2 focused sessions)

**Goal:** Decide exactly what data exists and where it belongs before building a UI.

**Deliverables**

- A canonical project inventory reconciled from `projects.yaml`, the project overview, and Plane.
- Project Card schema: owner, customer, lifecycle, repositories/branches, environments, tester,
  next milestone, and source-document links.
- Mobile Release Profile schema: client, source repo/branch, shared backend/branch, API URL,
  Android package ID, iOS bundle ID, Play track, TestFlight/App Store target, release state,
  required test evidence, and approval rule.
- A security classification for every referenced document: public/internal/restricted. Secrets are
  external references only.

**Pilot data:** TCS and TWPC, because their shared code and differing release destinations expose
the highest current risk.

**Exit criteria**

- A developer can distinguish TCS from TWPC without relying on memory.
- Unknown values are visibly marked `needs verification`, not filled with assumptions.
- One accountable owner confirms the initial profiles.

### Phase 1 - Make KAppHelper execution-ready (1-2 weeks)

**Goal:** Give Claude and developers a consistent way to resume and close work on the server.

**Deliverables**

- `resume` workflow: project briefing, current repo/branch state, last handover, active Plane
  issues, known risks, and next action.
- Structured handover template: work completed, evidence/tests, unresolved items, next action,
  and captures to persist.
- Project Cards and Release Profiles stored in KAppHelper as reviewed, versioned files.
- A release preflight that prints the selected profile and stops if required fields or confirmation
  are missing.

**Exit criteria**

- A developer returning to a long-running tmux/Claude session can refresh context in one action.
- The last completed work and next action are visible the next day.
- Claude can prepare but cannot ambiguously target a TCS/TWPC distribution release.

### Phase 2 - Dashboard MVP: portfolio and project navigation (2-3 weeks)

**Goal:** Ship a read-first internal web dashboard for developers and leads.

**Views**

- Portfolio: every application, owner, client, lifecycle, active work count, and last update.
- Meeting view: concise on-track/at-risk/blocked indicators, deadline/milestone, owner, and next
  action so a team status meeting can focus on exceptions rather than re-telling history.
- Project page: Project Card, repositories, environments, latest handover, decision/capture
  timeline, linked SharePoint documents, and open Plane issues.
- Release profile page: clearly separated mobile delivery lanes with a `verify before release`
  checklist.
- Search: project, customer, symptom, decision, and document metadata.

**Exit criteria**

- A new developer can find the correct project, documents, repositories, and active work without
  asking another developer.
- The dashboard links back to its source record instead of showing untraceable copied content.
- No secrets are displayed, indexed, or cached by the dashboard.

### Phase 2.1 - React dashboard foundation (in progress)

**Goal:** Establish a maintainable React foundation now, while live integrations are still being
designed.

**Delivered**

- Vite + React dashboard shell at `dashboard/`.
- Pre-filled portfolio cards from the registry, project overview, meeting captures, and TCS
  inspection evidence.
- Search, detail view, release safety presentation, evidence/source records, and a concise
  meeting-oriented portfolio summary.

**Explicitly deferred**

- Authentication, Plane and SharePoint connectors, live Git state, AI summaries/recommendations,
  and all mutation actions.
- Marketing-facing output; it needs its own approval and content-classification workflow.

### Phase 3 - AI briefs and next-work recommendations (2 weeks)

**Goal:** Turn the existing context into explainable, reviewable assistance.

**Deliverables**

- On-demand project summary generated from the Project Card, recent handovers/captures, Git state,
  and Plane issues.
- `Recommended next work` list, ranked by blocker/go-live status, dependency, urgency, ownership,
  and latest client/Ken decision.
- Source citations and freshness signals on every generated statement.
- Actions to open an existing Plane issue, draft a new one, or prepare a status update.

**Guardrails**

- Recommendations never automatically change Plane priority, assignee, or status.
- If sources conflict or are stale, the dashboard says so and asks for refresh/confirmation.
- Draft issue/update creation shows a preview before any write to Plane.

**Exit criteria**

- A developer can explain why an item was recommended and open the exact supporting source.
- A lead can use the project summary in a progress meeting without treating it as unverified fact.

### Phase 4 - Support knowledge and operating rhythm (2-4 weeks)

**Goal:** Make first-line troubleshooting accessible without requiring the original developer or AI.

**Deliverables**

- Structured troubleshooting entries: product, client, symptom, environment, cause, resolution,
  verification, and linked source.
- Support search with product/filter + keyword suggestions.
- Project health and go-live views for leads: outstanding blockers, tester/owner, last update, and
  release readiness.
- Optional cadence prompts for four-hour client-progress updates and end-of-day handover.

**Exit criteria**

- A junior support person can find an existing resolution by product and symptom.
- A project owner can show current issues and next milestone to a client without manually merging
  notes from several systems.

## Suggested technical shape

- **Dashboard:** an internal Next.js/TypeScript application with authenticated access.
- **Read adapters:** Git/KAppHelper files, Plane API/MCP-backed service, and SharePoint links or
  approved Microsoft Graph integration.
- **Writes:** narrowly scoped service actions only; require user confirmation and audit the
  resulting Plane/Git record.
- **Hosting:** server-first, alongside the existing Claude workflow, after access/backup/security
  ownership is agreed.

Do not begin with automatic release upload, direct database access, or broad SharePoint ingestion.
Those are later capabilities after the release profile, permission, and audit model are proven.

## Backlog: first implementation slice

1. Add the Project Card and Mobile Release Profile schemas to KAppHelper.
2. Use `docs/project-intake-template.md` to populate and review TCS + TWPC profiles, marking every unknown field explicitly.
3. Build a server-friendly `resume` and `handover` path that reads/writes those files.
4. Build a read-only dashboard page for the two pilot profiles.
5. Add Plane issue read view for those profiles.
6. Add AI project summary with source links; recommendations remain read-only.

## Decisions required before implementation

- Which server/repository will host the dashboard and who administers it?
- Which identity provider/access group may view internal project and client context?
- Is Plane the approved canonical tracker for all custom-app work?
- Which SharePoint library is the team-owned location, rather than one developer's personal area?
- Who confirms the TCS/TWPC release profiles and the required test evidence?

## Definition of success for the pilot

The pilot succeeds when a developer preparing a TCS or TWPC change can, in under five minutes:

1. Open the correct project and work item.
2. See the relevant repo/branch, API target, and release lane.
3. Read the last handover and unresolved risks.
4. Identify the next recommended Plane item and its evidence.
5. Generate a release plan that requires explicit developer confirmation before any distribution
   command is shown.
