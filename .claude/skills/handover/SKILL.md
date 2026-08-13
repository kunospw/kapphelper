---
name: handover
description: Wrap up a Claude session — surface anything durable that should be captured, commit kapphelper changes, push to GitHub so the other machine (Dyah local ↔ server) picks them up next `session-start`. Use when the user says "handover", "wrap up", "end of session", "push kapphelper", or before switching machines.
---

# handover

End-of-session sync. Mirror of `session-start`: session-start pulls, handover pushes.

Never assume the other side has what you learned this session — if it's not in git, it doesn't exist for the other machine.

## When to run

- User says "handover", "wrap up", "session done", "push kapphelper"
- User is about to switch machines (local → server, or vice versa) and wants continuity
- Long/eventful session that generated captures, memory updates, or registry edits
- Before a long break where you'll forget what was in flight

## When NOT to run

- Trivial session (read-only, no context worth persisting) — just say so, skip the push
- Kapphelper working tree is already clean AND you know nothing durable came up → nothing to do
- Mid-session (unless user explicitly asks) — handover implies you're winding down

## Steps

### 1. Check kapphelper state

```bash
cd ~/klaudecode/kapphelper
git status --short
git log --oneline origin/main..HEAD 2>/dev/null   # unpushed local commits
```

Categorise what you see:
- **Modified/new files** in `apps/*/capture/`, `clients/*/capture/`, `memory/`, `projects.yaml`, `apps/*/APP.md`, `clients/*/CLIENT.md` → normal handover material
- **Modified files elsewhere** (`.claude/skills/*`, `standards/*`, `CLAUDE.md`, `bootstrap.*`) → structural change; flag it in the commit message
- **Unpushed local commits** → still need to push even if working tree is clean

If nothing changed and nothing unpushed → skip to step 6 with "nothing to sync".

### 2. Surface uncaptured durable info

Before committing what's staged, scan the current conversation for things that **should** be in kapphelper but aren't yet:

- Decisions made (from Ken, from the user, from a meeting)
- New gotchas / constraints / "we tried X, don't do Y" lessons
- Client conversations, screenshots pasted in chat
- Deploy target changes, new services, new env vars → belongs in `projects.yaml`
- New standards or handbook updates

Ask the user, one crisp list:

> Before I push, these came up this session — should any of these be captured first?
> - `<summary>` (would become `apps/kairostsapp/capture/2026-08-14_ken_...md`)
> - `<summary>` (would become a `memory/feedback_*.md`)
> - `<summary>` (would update `projects.yaml` for tsapp `deploy.env_file`)

If yes → invoke `/capture` (or write the memory) BEFORE the commit. If no or unsure → the user says skip and we move on.

Never write captures unilaterally — surface, then wait.

### 3. Pull first (avoid divergence)

```bash
git fetch origin main
git pull --ff-only origin main
```

If pull fails (non-fast-forward = the other machine pushed since your last `session-start`):

- **Stop.** Do not force. Do not merge unilaterally.
- Report the conflict to the user with `git log --oneline HEAD..origin/main` so they see what came in from the other side.
- Options to offer: `git pull --rebase` (usually safe for append-only captures), or hand-resolve.

### 4. Stage + commit

Prefer specific paths over `git add .` — captures and memory rarely overlap so this is usually safe, but structural changes deserve a review pass.

```bash
git add <paths>
git status --short   # double-check nothing surprising staged
git commit -m "<message>"
```

**Commit message format:**

```
<scope>: <what changed>

<optional 1-2 line why, if not obvious from paths>
```

Examples:
- `capture(tsapp): password mgmt plan from Ken 2026-08-14`
- `memory: git push default to personal, not org`
- `registry: add kdocverify prod deploy target`
- `skills: add handover + capture`
- `handover: session on tsapp phase-2-build — 3 captures, 1 memory update`

If multiple unrelated changes → prefer multiple commits over one giant one. Cleaner history when the other side pulls.

### 5. Push

```bash
git push origin main
```

If push fails (someone pushed while you were committing) → back to step 3 (pull, replay), then re-push.

**Never `git push --force`** to main. If you think you need to, stop and ask.

### 6. Cross-check app repos (advisory)

If the session touched code in one or more app repos, remind — don't commit them:

```bash
for repo in <app-repo-paths-touched>; do
  cd "$repo" && echo "── $(pwd) ──" && git status --short && git log --oneline -3
done
```

Report:
- Uncommitted changes in app repos (kapphelper's push doesn't cover those)
- Local commits ahead of origin (app repo push still owed)

Don't push app repos automatically — different rules per repo, different reviewers.

### 7. Report

Tight two-line summary:

```
✓ kapphelper synced — <N> commits pushed to origin/main
  <last commit subject> (<sha>)

App repos still needing attention (if any):
  <repo>: <N> uncommitted, <N> unpushed on <branch>
```

Or if nothing to push:

```
✓ kapphelper already clean, nothing to sync.
```

## Rules

- **Never force push.** Not to main, not to shared branches.
- **Never commit files under `.gitignore` with `-f`.** If a file needs to be tracked, edit `.gitignore` first as its own commit.
- **Never commit raw credentials.** If a capture includes a screenshot or email paste, the `capture` skill should have scrubbed already — but sanity-scan the diff for `password=`, `token=`, `Basic <base64>`, `Bearer `, private key headers before pushing.
- **Never edit past captures.** Handover appends new files; corrections go in new captures that reference the old one.
- **App repos are separate.** This skill only handles kapphelper. Prompt for app-repo pushes; don't do them silently.
- **Pull before push, always.** Even if the working tree was clean when you started — someone else might have pushed while you were on your session.

## After handover

If the user is ending the session:
- Note that `session-start` on the other machine (or next Claude session on this one) will now see everything you pushed.
- If you flagged uncommitted work in app repos → remind before they close terminal.

If the user is continuing:
- Working tree is clean, they can keep going. Nothing else to do.
