---
name: plane-sync
description: Query Plane for the current project's open issues (assigned to me, urgent, blockers, recently changed), cross-reference with existing captures, and propose new captures for actionable issues that have no kapphelper record yet. Read-only to Plane — never creates or modifies issues. Use when you want to know what's on your plate, before /handover, or after a stakeholder mentions "I filed a Plane issue for that."
---

# plane-sync

Bridge between Plane (source of truth for open work) and kapphelper (durable session context). Surfaces gaps; never modifies Plane; never writes captures without approval.

## When to run

- Start of a work block — "what should I be looking at?"
- After a stakeholder says "I filed a Plane issue for that" — check if it's already tracked
- Before `/handover` — surface unresolved Plane items so nothing durable slips
- After a long absence — see what moved in Plane while you were away

## When NOT to run

- Plane MCP not configured / unreachable → stop and report; don't fall back to stale local snapshots
- Current project has no `plane.project` set in `projects.yaml` → propose adding it, don't invent
- General Plane browsing — this skill is for kapphelper-relevant issues, not project management

## Steps

### 1. Identify project + Plane project ID

- User named the project? Use it.
- Session context makes it obvious? Confirm, don't assume.
- Ambiguous → list registered `apps.*` + `clients.*` from `projects.yaml`, ask.

Once slug known, read `projects.yaml`:
- `apps.<slug>.plane.project` OR `clients.<slug>.plane.project`

If missing → propose the addition, don't hardcode a project ID.

### 2. Query Plane via MCP

Use whichever Plane MCP tools are available (names vary per server — check the tools list at runtime). At minimum, pull three buckets:

- **Assigned to me** with status ≠ Done/Cancelled
- **Urgent / blocker** priority (any assignee) with status ≠ Done/Cancelled
- **Recently changed** — status transitions or comments in the last 7 days

If any MCP call fails → **stop and report**. Don't silently fall back to whatever data you had lying around.

### 3. Cross-reference with existing captures

For the current project, list captures that reference Plane issues:

```bash
grep -lE "^plane:\s*[^—]" apps/<slug>/capture/*.md clients/<slug>/capture/*.md 2>/dev/null
```

Extract the Plane IDs from frontmatter (`plane: KTS-42`). Match against the Plane query results and classify:

| State | Meaning | Action |
|---|---|---|
| In Plane, has capture | Known, tracked | No action; mention in report |
| In Plane (urgent/blocker), **no capture** | Gap | Offer to draft capture |
| Capture references issue, Plane status now Done | Stale | Suggest updating capture status or writing supersede |
| Capture references issue, issue no longer in Plane results | Likely closed/archived | Suggest verifying |

### 4. Report

One tight block per bucket. Example:

```
Plane sync — TaiSin (KairosTSApp)
─────────────────────────────────
Assigned to me (3 open):
  KTS-45 [In Progress]  Fix login redirect on mobile Safari    (2d ago)
  KTS-47 [Todo]         Per-company user invitations           (1d ago) — no capture
  KTS-52 [In Review]    Password reset email template          → capture 2026-08-14_ken_password-mgmt-plan.md

Urgent / blocker (2):
  KTS-49 [Blocker]      Prod invoice PDF corrupted for LKHE    (no capture)
  KTS-51 [Urgent]       Google Drive quota near limit          (no capture)

Recently changed (last 7d, not shown above):
  KTS-38 → Done            (capture exists — mark closed?)
  KTS-42 → Todo (new)      (no capture)

Suggest capturing: KTS-49, KTS-51, KTS-47, KTS-42? (or which subset)
```

If everything is already tracked and nothing needs surfacing → say so plainly and stop. Don't manufacture work.

### 5. Draft capture(s) for approved items — never auto-write

For each issue the user approves (`y`, `yes`, or `capture KTS-49`), draft the capture body first (do not write yet):

```markdown
---
date: <today>
source: plane
from: <plane reporter or assignee>
type: issue                  # or `constraint`/`requirement` if better fit — user can override
about: <project or feature — from Plane title>
plane: KTS-49
status: unconfirmed          # human still needs to validate the context around it
---

## What
<title from Plane + short pull from issue body>

## Why
<Plane issue description as-is, or user-supplied context>

## Impact
<what this blocks — from Plane priority + linked issues + user's added context>
```

Show the draft in chat. On approve → write to `apps/<slug>/capture/<YYYY-MM-DD>_plane_<slug>.md`. Then next issue.

**Never write silently.** User approves each capture individually or as a batch (`capture all`).

### 6. Propose Plane updates in the other direction (advisory only)

If any captures with `plane:` reference issues whose Plane state contradicts the capture (e.g. capture says "Ken approved this workaround", Plane still shows the ticket as Blocker):

- Flag the discrepancy
- Propose what should change on the Plane side
- **Never modify Plane.** Print the proposed comment/status-change text; user handles it in Plane UI

## Rules

- **Read-only to Plane.** No state changes, no comments, no assignment updates. If you think Plane needs updating, propose text and stop.
- **Never auto-create Plane issues.** Per 2026-08-12 rule. Creation lives in `/capture`'s draft flow; it needs the user's separate `y` there.
- **Never auto-write captures from Plane.** Draft, wait, then write on approval.
- **One-shot per invocation.** This isn't a background watcher; don't schedule it.
- **Credential scrub applies to captures written here too.** Plane issue bodies often paste log snippets with connection strings, tokens, or PII — sanitize before write per the `capture` skill's scrub rules.
- **Don't invent issue numbers.** If a Plane call fails mid-run, drop that bucket from the report instead of guessing.

## What this skill does NOT do

- **Modify Plane state** — no comments, transitions, assignments, or label changes
- **Create Plane issues** — that's `/capture`'s advisory draft flow with its own approval gate
- **Sync labels, custom fields, or attachments** — first version is status + priority + assignee + title/body only
- **Continuous watching** — one-shot; the user runs it when they want it

## After sync

If new captures were written → prompt for `/handover` so they reach the other machine. A capture that sits on your local disk isn't shared knowledge yet.
