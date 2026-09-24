---
name: onboard
description: Guided first-time setup for a developer new to kapphelper — check prerequisites, verify repo access and git identity, resolve which project they own, confirm their name will match the dashboard, walk them through their first real capture and a safe handover. Idempotent (skips what's already done). Use when the user says "onboard", "setup kapphelper", "I just cloned this", "aku baru clone", or is clearly new to the repo.
---

# onboard

Walk a new developer from "just cloned" to "first capture pushed" — one step at a time,
verifying each before moving on. This skill *guides and checks*; the developer runs anything
that touches their accounts or credentials.

Reference doc: `docs/team-onboarding-guide.md` (Jalur A). Reply in the language the developer
writes in (the team mostly writes Indonesian; keep technical terms in English).

## Ground rules (read first, apply throughout)

- **One step per turn.** Say what you're about to check and why (one line), run the check,
  report pass/fail, then move on. Don't dump the whole checklist.
- **Idempotent.** Detect what's already done and skip it. Safe to re-run.
- **Never see credentials.** Never ask the developer to paste a password, token, private key, or
  `.env` value. Never print one. If something needs a credential, tell them to put it in their
  own gitignored/local file or password manager and only check that it *exists*.
- **No silent side effects.** Don't install software, change global git config, edit
  `projects.yaml`, or push anything without showing the exact command and getting a yes.
- **Stop on ambiguity.** Which project? Which name? Which machine? Ask; don't guess.
- **Don't change the repo during onboarding**, except the developer's own capture via `/capture`
  (step 8). No commits of anything else.

## Steps

### 1. Confirm where you are

```bash
git rev-parse --show-toplevel
git remote get-url origin
git branch --show-current
```

- Not in the kapphelper repo → tell them to `cd` into it (`~/klaudecode/kapphelper`) and rerun.
- Repo not under `~/klaudecode/` → Ken's rule: Codex memory lives there. Show the move command
  (bootstrap prints it) and let them decide; don't move it yourself.

Detect OS (Windows PowerShell vs bash) and use matching commands from here on.

### 2. Tools

Check, don't install:

| Tool | Check | If missing |
|---|---|---|
| git | `git --version` | required — point to installer, stop |
| Codex CLI | `codex --version` | required — they're running it, so present |
| gh (optional) | `gh --version` | suggest for auth; not required |
| docker | `docker --version` | **not needed** for the dev path — warn-free skip |

### 3. Git identity and access

```bash
git config user.name
git config user.email
git fetch origin --quiet
git ls-remote --heads origin main
```

- Identity empty → show `git config --global user.name "<Full Name>"` / `user.email` and ask
  before running. Real name (not initials) — attribution matters.
- `fetch` / `ls-remote` fails with 403/not found → they need collaborator access. Tell them to
  message Dyah with their GitHub username (`gh repo edit kunospw/kapphelper --add-collaborator
  <user>`). Stop here until fixed.
- **Write access** can't be proven without pushing; don't test by pushing. Note it as "verified
  at first handover".
- Auth method (only if they'll push and it isn't set): `gh auth login` + `gh auth setup-git`, or
  an SSH key. Explain: the *private* key never leaves their machine; only the *public* key goes
  to GitHub.

### 4. Bootstrap state

```bash
git pull --ff-only
```

Then check the runtime folders exist (`artifacts/`, `logs/`). If not, offer to run
`bootstrap.ps1` / `bootstrap.sh` (safe, idempotent; Docker is only a warning). If `pull` fails,
**stop and report** — never onboard on stale data.

### 5. Model and usage (one line each)

- Default is **Sonnet 5, effort medium** — the team shares a limited pool (memory
  `model-usage-discipline`). Ask them to run `/status` and confirm.
- Credential hygiene: real values live in their own private notes, never in chat or git
  (memory `credential-hygiene-in-ai-sessions`).

### 6. Which project(s) are they on?

Read `projects.yaml`. List `apps.*` and `clients.*` with `display_name` and `stakeholders.active_dev`.

- Ask which project(s) they work on. If they name one not in the registry → propose adding it
  later (separate step, needs approval) — **don't add it now**.
- Read that project's `APP.md`/`CLIENT.md` and the 3 newest captures; give a **3-line** summary
  (what it is, current phase, latest decision). Don't restate whole files.
- If `active_dev` isn't them or is `null`/"Needs verification", say so — that's a gap for Dyah/Ken
  to resolve, not for you to edit.

### 7. Will the dashboard recognise them?

The dashboard attributes a capture to a developer by its `from:` field. Read
`dashboard/data/portfolio.json` → `developerActivity[].name` and check the developer's first name
or full name matches exactly one entry.

- Match → tell them to write `from: <First name>` (or full name) in captures.
- No match → their captures will be saved but won't show on the dashboard until Dyah adds them
  (a `developerActivity` entry or an alias). Tell them to message Dyah; don't edit the file.

### 8. First real capture

Not a practice one — a real note that makes their work visible. Prompt for, in order:
what they're working on now · why/context · blocker (or "none") · next step · related Plane ID
if any. Then invoke `/capture` with those answers (it scrubs credentials, formats the file, and
only *drafts* Plane issues). Fields: `source: session`, `from:` as decided in step 7, `type:`
`issue` or `design` as fits, `about:` the project.

Because this first capture is a status report, also collect the **dashboard status fields** from
the `capture` skill (project id, `health`, `milestone` + `milestone_date`, `blocker`, `next_step`,
`active_dev`). Ask each one; skip any they don't know rather than guessing — an omitted field
changes nothing on the dashboard. This is how a developer fills in their project's milestone and
blocker without touching `portfolio.json`.

### 9. Handover (safe push)

Invoke `/handover`. Before it pushes, show `git status` and `git log origin/main..HEAD --oneline`
and confirm only their capture is included. Remind: pull first, never force-push. If push is
rejected for permissions → back to step 3 (access). If non-fast-forward → `git pull --rebase
origin main` then push.

### 10. Wrap-up

Print a short checklist with ✓ / ✗ / ⚠ for: tools · repo location · git identity · access ·
model/usage · project resolved · dashboard name match · first capture · pushed. Then the daily
loop in one line:

`/session-start → work → /capture → /handover`

Point to `docs/team-onboarding-guide.md` (rules in §7, troubleshooting in §10). Mention they
appear on the dashboard after Dyah pulls and syncs — not instantly.

## What this skill does NOT do

- Install software, log in to GitHub for them, or handle any credential.
- Edit `projects.yaml`, the dashboard data, or anyone else's files.
- Set up the local dashboard (Jalur B) — only if they explicitly ask; then follow the guide §8.
- Grant repo access — that's Dyah (or Ken for an org move).
