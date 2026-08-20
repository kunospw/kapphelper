---
name: session-start
description: Orient at the start of a Claude session — pull the latest kapphelper, resolve which project the user is on, read that project's app-repo git state and recent captures, and print a briefing. Use whenever a session begins, when the user says "continue X", or when project context is unclear.
---

# session-start

Start-of-session briefing. Never assume you know the state — always pull first, then read.

## When to run

- New session begins with any request that touches a registered project
- User says "continue <project>", "let's work on <project>", or names an app/client
- Project context is unclear (you can't tell which app/client the user means)
- After a long pause where memory context may be stale

## Steps

### 1. Sync kapphelper

Pull the shared workspace. Never read stale.

```bash
cd ~/klaudecode/kapphelper
git pull --ff-only
```

If pull fails (conflict, no network), **stop and report** — don't proceed on stale data.

### 2. Load the registry

Read `projects.yaml`. Identify the project the user is on:

- If user named it explicitly (`"continue kdocverify"`) → use that slug
- If ambiguous → list registered `apps.*` + `clients.*` and ask
- If it's a fresh project not in the registry → propose adding it (don't add without approval)

### 3. Read project context

For the chosen `<slug>`, read in order:

1. `apps/<slug>/APP.md` or `clients/<slug>/CLIENT.md` — what/why/phase/owners
2. Latest 3 files in `apps/<slug>/capture/` (or `clients/<slug>/capture/`), newest first —
   most recent decisions and meeting notes
3. `memory/MEMORY.md` — scan the whole index. Surface both project-tagged entries AND universal rules (commit format, credential handling, git branch model, etc — anything the description makes clear applies broadly). Universal rules missed here become re-work later.

### 4. Check the app repo state

From `projects.yaml` `repo:` block, find the app repo path on disk. Then:

```bash
cd <app-repo-path>
git fetch origin --quiet          # catch divergence before user starts editing
git status -sb
git log --oneline -5
git branch --show-current
```

Note: uncommitted changes, current branch, last 5 commits.

**If the fetch reveals divergence** (`ahead N, behind M` where M > 0 — or diverged):

- Stop and surface it in the briefing before letting the user continue.
- Divergence usually means either (a) the same repo has a second active checkout somewhere (see `reference_project_checkouts.md`) or (b) another dev pushed while you were away.
- Recommend resolution based on state: `git pull --ff-only` if only behind; `git pull --rebase` if diverged with clean tree; commit/stash first if there are also uncommitted changes.
- Do NOT auto-resolve. User decides.

**If fetch fails** (no network, wrong remote, auth issue): note it in the briefing as "⚠️ remote state unknown" and proceed with local-only view. Don't fail the whole briefing on a fetch error.

### 5. Optional — check Plane

If Plane MCP is connected and `projects.yaml` `plane.project` is set, query for:
- Issues assigned to the current user, status ≠ done
- Issues marked urgent/blocker

Skip silently if Plane MCP isn't available — don't fail the briefing.

### 6. Print the briefing

One tight paragraph. Format:

> **`<display_name>`** — on branch `<branch>`, `<N>` uncommitted files.
> Last commit: `<subject>` (`<relative time>`).
> Recent capture: `<date>` — `<summary from frontmatter "about:">`.
> Phase: `<from APP.md>`.
> `<blocker or urgent count from Plane, if any>`.
> Where do you want to start?

Example:

> **KDocVerify** — on branch `main`, 0 uncommitted.
> Last commit: `[p2] role separation retest complete` (2 days ago).
> Recent capture: 2026-08-12 — Ken's differentiation vision (QR / crypto / blockchain).
> Phase: Phase 2 code complete, Phase 3 (Documents module) next.
> No open Plane blockers.
> Where do you want to start?

## What NOT to do

- Don't restate the whole APP.md — the user has read it, or will if you point them.
- Don't dump raw `git log` — summarise.
- Don't guess project if ambiguous — ask.
- Don't skip the pull. Ever.

## After briefing

Wait for the user's direction. Their answer determines whether the next skill is `deploy`,
`capture`, plain code editing, or something else entirely.
