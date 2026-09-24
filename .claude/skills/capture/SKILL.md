---
name: capture
description: Turn a decision, meeting note, email, screenshot, or client conversation into a properly-formatted capture file in the right project's `capture/` dir. Scrubs credentials before writing. Drafts a Plane issue if actionable (never auto-creates). Use when the user says "capture this", "note that <thing>", pastes a screenshot/email, or after a decision worth persisting.
---

# capture

Convert ad-hoc information into a durable, searchable capture file. Runs the credential-scrub. Drafts Plane issues but never auto-creates them (per 2026-08-12 rule).

## When to run

- User explicitly says "capture this", "note this", "save this decision"
- User pastes a screenshot, email, or WhatsApp thread they want retained
- A decision was made (by Ken, the user, or in a meeting) that changes scope, phase, or approach
- A durable gotcha surfaced ("we tried X, don't do Y") — this is *memory*, not capture; see step 3
- `/handover` surfaced something worth capturing before the push

## When NOT to run

- Info is already in git (code, commit message, PR description) — don't duplicate
- Info is ephemeral (current-conversation state, in-flight debugging) — that's what the conversation is for
- Info restates something already in an existing capture — link to it instead, don't re-capture

## Steps

### 1. Classify: capture vs memory vs registry

Not everything belongs in `capture/`. Route first:

| Kind of info | Goes in | Format |
|---|---|---|
| Event (meeting, email, decision, screenshot) tied to a specific project | `apps/<slug>/capture/` or `clients/<slug>/capture/` | this skill |
| Durable lesson that applies across projects or sessions | `memory/*.md` (per top-level CLAUDE.md memory instructions) | not this skill — write a memory |
| Change to deploy target, service, port, contact | `projects.yaml` edit | not this skill — direct edit + note in commit |
| Standard / convention / handbook rule | `standards/` | not this skill |

If it's clearly memory or registry, say so and skip. Don't force it into a capture.

### 2. Identify the project

Which `<slug>` under `apps/` or `clients/`?

- User named it (`"capture this for tsapp"`) → use it
- Session context makes it obvious (you've been editing KairosTSApp all session) → confirm, don't assume
- Ambiguous → list registered `apps.*` + `clients.*` from `projects.yaml`, ask

If the project isn't in `projects.yaml` → don't hardcode a new slug. Propose adding it to the registry first (separate step, user approves).

### 3. Identify source, from-person, type, actionable

Fill in the frontmatter fields. If unclear, ask **before** writing — never guess these:

| Field | Values |
|---|---|
| `source` | `meeting` \| `email` \| `whatsapp` \| `call` \| `screenshot` \| `session` |
| `from` | Person's name or handle. Common: Ken, Jesynta, Dyah, client name. |
| `type` | `decision` \| `requirement` \| `clarification` \| `constraint` \| `issue` \| `design` |
| `about` | Project or feature — short phrase, human-readable |
| `status` | `confirmed` (heard directly) \| `inferred` (deduced from context) \| `unconfirmed` (needs follow-up) |
| `plane` | Plane issue ID if it maps to one, else `—`. See step 6 for drafting. |

#### Optional: dashboard status fields (only for project status updates)

If the capture is the developer reporting where a project stands (not a meeting decision or a
gotcha), also collect these and add them to the frontmatter — the dashboard reads them
(`dashboard/scripts/sync-captures.mjs`) and shows the project as "reported by <from>, <date>":

| Field | Value |
|---|---|
| `project` | project id from `projects.yaml`/the dashboard: `taisin`, `kdocverify`, `tcs`, `twpc`, `kfms`, `oms`, `kconnect`, `kportal` (defaults to the capture folder if that is an id — `clients/twl/` is **not**, so set it) |
| `health` | exactly one of: `Active`, `On track`, `At risk`, `Needs plan`, `Needs verification`, `No update`, `Paused`, `Release blocked` |
| `milestone` + `milestone_date` | next milestone in plain words + `YYYY-MM-DD` target (only if the developer actually knows the date) |
| `blocker` | what is blocking, or `none` |
| `next_step` | the single next action |
| `active_dev` | who is driving it now |

Rules: **ask, don't infer** — leave a field out rather than guess it (an omitted field changes
nothing; a wrong one shows up in front of Ken). If the blocker changes, ask whether `health`
should change too (`blocker: none` alone does not change health). Latest capture wins per
field, so a later capture with `milestone:` replaces the earlier one. Invalid `health` values or
dates are ignored with a warning, so use the exact spellings above.

### 4. **SCRUB CREDENTIALS** (mandatory, before write)

Screenshots and email pastes routinely contain passwords, tokens, connection strings, API keys, and personal contact info. **Never write raw content into the capture file without scrubbing first.**

Scan for and replace:

| Pattern | Replace with |
|---|---|
| `password=<anything>`, `pwd=<anything>`, `Pass: <anything>` | `password=<REDACTED>` |
| `Basic <base64>`, `Bearer <token>` | `Basic <REDACTED>` / `Bearer <REDACTED>` |
| `-P "<value>"` (sqlcmd), `-p<value>` (mysql) | `-P "<REDACTED>"` |
| Connection strings with `Password=…` | `Password=<REDACTED>` |
| API keys, secret keys, JWT payloads | `<REDACTED — see password manager>` |
| Private key blocks (`-----BEGIN…`) | `<REDACTED — private key>` |
| Personal phone numbers (unless intentionally captured for contact list) | `<REDACTED>` or last-4-digits only |
| Email addresses of external parties (not Kairos staff) | Keep the domain, redact the local part unless it's already public |

Note in the capture body which fields were scrubbed and where the real values live (password manager entry name, docker secret filename, `.env.live` key name), so a reader can find them without them being in git.

If a screenshot is genuinely all-sensitive → describe what was in it in prose, don't paste. Save the raw screenshot outside kapphelper (e.g. user's local folder), reference it by filename only.

### 5. Write the file

Filename: `apps/<slug>/capture/<YYYY-MM-DD>_<from-slug>_<topic-slug>.md`
- Date is the date of the *event*, not today (a meeting on Monday you capture Wednesday → Monday's date)
- `<from-slug>` and `<topic-slug>` are lowercase, hyphenated, filesystem-safe
- Never overwrite an existing capture — if the filename collides, append a numeric suffix (`_2`) or refine the topic slug

Body template (from CLAUDE.md):

```markdown
---
date: 2026-08-14
source: meeting
from: Ken
type: decision
about: KairosTSApp self-service password reset
plane: KTS-42
status: confirmed
---

## What
<one paragraph — the fact or decision, plainly stated>

## Why
<who said what, and the reason they gave — attribution matters>

## Impact
<what changes for us going forward — link to Plane issues that open, close, or supersede>

## Scrubbed
<list any redactions and where the real values live — e.g. "SA password in 1Password 'tsapp-pilot-db'; SFTP creds in secrets/sftp.json on server">
```

Omit `## Scrubbed` if nothing was redacted.

### 6. Draft a Plane issue if actionable — never auto-create

If `type` is `decision`, `requirement`, `constraint`, or `issue` AND it implies work → draft the Plane issue body, but **do not create it**. Per 2026-08-12 rule: propose, wait for approval.

Format the draft in the response (not in the capture file):

```
Actionable — proposed Plane issue:

  Project: <plane project from projects.yaml>
  Title: <verb-first, ≤ 80 chars>
  Priority: <urgent | high | medium | low>
  Description:
    <one paragraph — what needs to happen, why, definition of done>
  Link to capture: apps/<slug>/capture/<filename>.md

Create it? (y/n)
```

If user says yes → invoke Plane MCP `create_issue`. If no → stop; the capture still stands on its own.

If created → update the capture's `plane:` field with the new issue ID before commit.

### 7. Report + hand off

```
✓ Captured: apps/<slug>/capture/<filename>.md
  Source: <source> from <from>
  Type: <type> — <one-line about>
  <"Plane draft above — awaiting go-ahead" if applicable>
  <"Scrubbed: <count> fields" if applicable>
```

Then stop. Let the user decide next move (usually: `/handover` to push, or keep working).

## Rules

- **Append-only.** Never edit a past capture. If new info contradicts or extends an old one, write a new capture that references the old (`## Supersedes`: link to old file).
- **One event per file.** Meeting + email on same day → 2 captures.
- **Scrub before write, not after.** Sanitizing after the fact leaves the raw content in git history.
- **Never auto-create Plane issues.** Draft only. User approves.
- **Don't stuff `capture/` with things that belong elsewhere.** Memory ≠ capture. Registry ≠ capture.
- **Don't shorten the `from:` to initials or "user".** Attribution decays fast; write the actual name.

## What this skill does NOT do

- **Push to GitHub** — that's `/handover`.
- **Update `projects.yaml`** — that's a direct edit; capture might reference the update but doesn't perform it.
- **Write memories** — different file, different location (`memory/`), different format (frontmatter with `type: feedback|project|user|reference` per top-level memory instructions).
- **Store binaries.** Screenshots stay outside kapphelper (user's local folder or an external drive). Capture files reference them by name.

## After capture

If several captures piled up this session → prompt for `/handover` so they reach the other machine. A capture that sits only on your local disk isn't shared knowledge yet.
