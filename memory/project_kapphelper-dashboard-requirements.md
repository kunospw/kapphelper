---
name: kapphelper-dashboard-requirements
description: Ken Ho's stated requirements/feedback for the team dashboard (KAppHelper Dashboard app), gathered from the 9 Sept and 11 Sept 2026 team meetings — the origin brief for dashboard/
metadata:
  type: project
---

Dyah's "K Epicor Helper"-style dashboard (now the `dashboard/` app in this repo) was raised
unprompted by Ken (9 Sept meeting) and then demoed by Dyah (11 Sept meeting). Requirements/feedback
gathered directly from those two sessions, in Ken's own terms:

- **Ken's original ask (9 Sept):** he wants a way to see project status "in one view" — not
  scattered across Track/Plane — so he can quickly tell whether the team is on track, spending too
  much or too little time, and whether a deadline will be met. He explicitly does not want to know
  every detail in the standing meeting; the dashboard should surface the summary, with detail
  available on demand.
- **Data sources confirmed working by 11 Sept demo:** git commits + Plane work items + project
  documentation (Dyah's SharePoint folder of app/project docs + meeting notes) feed a timeline per
  project. Praisilia had also independently combined "summary meetings from my AI and your AI"
  into one shared file for the team around the same time — a related but separate manual synthesis
  effort, worth being aware of as a possible input/duplicate of what the dashboard automates.
- **AI summarization is planned, not yet built:** Dyah's plan (stated 11 Sept) is to have AI
  generate a summary of what needs attention/is blocked vs. on track per project, from the same
  timeline data — this maps directly to `dashboard`'s planned Ollama/DeepSeek summary service (see
  `PROJECT_HANDOFF` context: server-side only, never called from the browser, key kept server-side).
- **Sync must become automatic, not manual.** As of 11 Sept, git/Plane/doc syncing was still
  triggered manually one-by-one; Ken's explicit ask: "ask AI for a script... put it somewhere so it
  runs automatically" (e.g. hourly), so the dashboard reflects current state without someone
  remembering to sync, and so developers are naturally nudged to commit/log work regularly since
  it's what feeds the dashboard.
- **Needs a roadmap dimension, not just history.** Ken: "this is good for the things people have
  done, but we also need a plan about where things need to be" — i.e., current work + an explicit
  *next milestone* field per project (not just a commit/work-item timeline looking backward).
- **Hosting/access control:** host it on one of the existing app servers (Ken suggested the TS app
  server as a starting point) on a distinct port, restricted to people with a Kairos email /
  explicitly allowed — not open to everyone. A proper subdomain (e.g. something under `track.com`
  or similar, TBD) can come later once it's working.
- **Naming consistency feeds the dashboard too:** Ken's app/environment renaming decisions (see
  [[../clients/twl/capture/2026-09-11_ken_time-entry-rebrand-and-env-naming]] and the "Kairos
  Invoice Portal" rename) matter here because the dashboard is where inconsistent naming would be
  most visible/confusing across projects — worth keeping the dashboard's project list names in
  sync with `projects.yaml` `display_name` values as they change.
- **Keep the standing meeting itself short.** Ken repeatedly (9 Sept, 11 Sept) pushed back on
  meetings running long and asked for a quick round of status updates, with detail deferred to
  smaller separate discussions — this is the direct motivation for an action-first "Team Meeting"
  view rather than a page of prose per project.
- **Business-strategy guardrail relevant to what the dashboard should expose:** Ken does not want
  the team to over-advertise unfinished/prototype apps (KFMS, KPortal Supplier are explicitly
  "not ready" / MVP-only per 1 Sept meeting) and wants to avoid revealing proprietary
  differentiators (e.g. KDocVerify's approval-tree design) too early even to marketing. If the
  dashboard is ever shown to non-engineering stakeholders (e.g. Eileen for marketing planning), it
  should distinguish "verified live and generating revenue" (TWPC, TCS, Tai Sin) from "prototype/
  MVP, not customer-ready" (KFMS, KPortal Supplier/Customer) — matches the existing instruction in
  `PROJECT_HANDOFF` context not to infer deadlines/approval/release state that isn't recorded.

**Why this matters for current work:** this is the actual product brief behind the in-progress
`dashboard/src/components/MeetingView.jsx` redesign — treat it as the source of truth for what
"done" looks like, ahead of (and consistent with) `dashboard/docs/IMPLEMENTATION_PLAN.md`.

**How to apply:** When extending the dashboard (redesign or otherwise), check new features against
this list before inventing new ones — e.g. "next milestone" per project, automated hourly sync,
access restricted to Kairos emails, and keeping the Team Meeting view terse are Ken's explicit asks,
not assumptions.
