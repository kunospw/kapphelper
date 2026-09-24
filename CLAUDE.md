# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

**KAppHelper** — the shared workspace for Kairos custom-app work: context, memory, skills,
standards, and the registry that ties them to real repos, servers, and clients. Sibling to
`KEpicorHelper` (Epicor toolkit); this one covers everything that is *not* Epicor customization —
.NET backends, Node monorepos, React/Next portals, Flutter mobile.

Per Ken's rule, this repo lives at **`~/klaudecode/kapphelper/`** — Claude's memory belongs in
`~/klaudecode/`, never inside an app repo. App repos are only touched to read/edit their code.

**Where things are documented** — follow the pointer instead of asking me to restate it:

| Need | Read |
|---|---|
| Registered apps + clients, deploy targets, contacts | `projects.yaml` |
| Per-app motivation, phase, owners | `apps/<slug>/APP.md` |
| Per-client stakeholders, Epicor instances | `clients/<slug>/CLIENT.md` |
| Frozen source-of-truth docs (PDFs, scope docs) | `apps/<slug>/baseline/` or `clients/<slug>/baseline/` |
| Informal decisions, meeting notes, email captures | `apps/<slug>/capture/` or `clients/<slug>/capture/` |
| Durable lessons that outlive one project | `memory/` |
| Kairos engineering standards | `standards/` (or link to `Kairos_Dev_Knowledge_Handbook.md`) |
| One-time machine setup | `bootstrap.sh` (Linux) / `bootstrap.ps1` (Windows) |

**Start of session:** run `/session-start` (`.claude/skills/session-start/`) — git pull → registry
lookup → app-repo state → recent captures → briefing.

**To deploy / restart / tail logs / open DB shell on a live service:** run `/deploy`
(`.claude/skills/deploy/`) — reads `projects.yaml` for the target's config, runs non-privileged
pre-flight via SSH, then hands the `sudo` command to the user (advisory mode) or executes it
(executed mode, if the target is configured for it).

## Hard rules

- **Secrets never in git.** `.env` is gitignored; only `.env.example` shows the shape. Never write
  passwords, private keys, or tokens inline in any file here — reference *where* they live
  (password manager, Docker secret name), not the values.
- **Never touch memory from inside an app repo.** If you learn something durable while working in
  `KConnectApp/`, `KairosTSApp/`, etc., write it *here* (`memory/` or the relevant `capture/`),
  not into the app repo. Ken's rule.
- **Sync via git, both ends.** `~/klaudecode/kapphelper/` exists in at least two places (Dyah's
  local, Jesynta's server). `session-start` pulls first; `handover` pushes on session end. Never
  edit stale — always pull before writing.
- **Never `git push --force` to `main`.** Feature branches are fine; `main` is shared.
- **Deploy is gated per project.** `projects.yaml` `deploy:` block defines target, host, path,
  services, health checks. **Never deploy to a target not listed there.** If a target is missing,
  ask — don't hardcode.
- **On the server, Claude has no sudo.** Docker compose in the project folder is the ceiling.
  System-level ops (package install, service restart, firewall) are Ken's territory — if you
  think you need one, stop and ask.
- **Docker access varies per host.** On some hosts the user is in the `docker` group and can
  run `docker compose` directly. On others (e.g. `tsapp` box, user `drini`) docker requires
  `sudo` with a password — Claude cannot type that non-interactively. Those projects are
  flagged `deploy.mode: advisory` in `projects.yaml` — Claude prepares the deploy command
  and hands it to the user to run in their own SSH terminal, then does non-privileged
  verification (curl health, git log, container name check via ssh without sudo).
- **Capture must scrub credentials before write.** Screenshots and email pastes routinely contain
  passwords or tokens. The `capture` skill does this; if capturing manually, do it yourself
  first.
- **Plane issues: draft, don't auto-create.** If a capture is actionable, propose a Plane issue
  and wait for approval before creating (decided 2026-08-12).
- **Docs stay in sync with the registry.** If you rename a service, change a deploy path, or
  retire a project, update `projects.yaml` in the same change.

## Capture format

New file per event. Filename: `<YYYY-MM-DD>_<source-person>_<slug>.md`. Append-only — never edit
a past capture, write a new one.

```markdown
---
date: 2026-08-12
source: meeting          # meeting | email | whatsapp | call | screenshot | session
from: <person>
type: decision           # decision | requirement | clarification | constraint | issue | design
about: <project or feature>
plane: <ISSUE-ID>        # if actionable, else "—"
status: confirmed        # confirmed | inferred | unconfirmed
---

## What
<one paragraph — the fact or decision>

## Why
<attribution + reason>

## Impact
<what changes for us; link Plane issues that open/close/supersede>
```

## Optional dashboard status fields

A capture that reports where a project stands may add `project:`, `health:`, `milestone:`,
`milestone_date:` (YYYY-MM-DD), `blocker:`, `next_step:`, `active_dev:` to its frontmatter. The
dashboard applies the latest value per field and labels it "reported by <from>, <date>". `health`
must be one of `Active | On track | At risk | Needs plan | Needs verification | No update | Paused |
Release blocked`. Omit a field rather than guess it. Details: the `capture` skill.

## Two platforms — Dyah local (Windows), Jesynta server (Linux)

- **Dyah** runs Claude Code locally on Windows. Deploys reach the server via SSH.
- **Jesynta** runs Claude Code on `kconnect01` directly. Deploys run natively (docker compose
  locally on that box).
- The **same skills** work in both — deploy skill reads `deploy.target` (`local` or `ssh`) from
  `projects.yaml` and picks the right path.
- Bootstrap comes in two flavours: `bootstrap.sh` (Linux) and `bootstrap.ps1` (Windows). Run
  once per machine.
- Path convention in skills: use `~/klaudecode/kapphelper/` (both platforms expand `~`) or resolve
  from the repo's own location — never assume Linux paths or Windows drive letters.

## Sync model

```
       kairos/kapphelper (GitHub private)
                    ↑↓
       ┌────────────┴────────────┐
       ↓                         ↓
  Dyah local                Jesynta on kconnect01
```

GitHub is the sync hub. Server ↔ local never talk to each other directly. `session-start` does
`git pull`; `handover` does `git push` if anything changed. Capture filenames are timestamped +
attributed, so conflicts are rare.

## What lives here vs. in an app repo

| Belongs here (kapphelper) | Belongs in the app repo |
|---|---|
| Client conversations, meeting decisions, screenshots | Code, docker-compose.yml, migrations |
| Cross-session memory ("we tried X, don't do Y again") | Repo-specific README, CHANGELOG, CONTEXT |
| Standards that apply to every Kairos project | Repo-specific runbook |
| Deploy target + health probe definitions | The actual docker-compose service definitions |
| Plane project IDs, contact list per client | — |

If a file would restate what git or Plane already knows, don't write it. That is the rule the
whole workspace exists to enforce.
