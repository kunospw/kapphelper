---
name: feedback-commit-format
description: All commits (kapphelper AND every app repo) follow Conventional Commits — `<type>(<scope>): <desc>`. Applies universally, not per-project.
metadata:
  type: feedback
---

Every git commit Claude writes MUST follow **Conventional Commits** format:

```
<type>(<scope>): <desc>

[optional body — imperative present tense, wrap at 72]
```

- `<type>` ∈ `feat` | `fix` | `docs` | `chore` | `refactor` | `test` | `build` | `ci`
- `<scope>` = area affected (e.g. `tsapp`, `orchestrator-api`, `frontend`, `kdocverify`, `docker`). Optional but strongly preferred in multi-module repos.
- `<desc>` = short imperative, lowercase, no trailing period, ≤ 72 chars

**Why:** Kairos-wide convention documented in `standards/README.md` (sourced from `Kairos_Dev_Knowledge_Handbook.md`). Dyah kept having to rewrite Claude's commit messages by hand when they came out as free-form status summaries — that's re-work every session. Consistent history also unlocks changelog automation and grep-by-area.

**How to apply:**

- **Every** commit Claude generates: kapphelper commits, KairosTSApp, KConnectApp, KDocVerify, any app repo. No exceptions.
- Scope example (right): `feat(tsapp): per-company Epicor server routing`
- Scope example (wrong): `Track B built, pushed cb1a0ac` ← this is status-log prose, not a commit message
- Status-log-style summaries (dates, hashes, human names) belong in:
  - `docs/session-handover-*.md` bodies (app repo)
  - OR kapphelper `apps/<slug>/capture/` files
  - NEVER in commit messages themselves
- Type guidance when unsure:
  - `feat` — new user-facing capability
  - `fix` — bugfix
  - `refactor` — code change, no behavior change
  - `chore` — tooling, deps, config
  - `docs` — markdown or code comments only
  - `build` — build system, docker, CI config
- Multi-commit sessions: never collapse unrelated logical changes into one giant commit. Each area of change gets its own conventional-commit message.
- Existing non-conforming commits in a branch: don't retroactively rewrite (history is shared). Just start conforming from now on.

**Related:**
- Branch model: see `standards/README.md` — `feature/<name>` → `dev` → `prod` for new repos; existing repos grandfathered.
- CRLF gotcha (`git add .` blindly): also in `standards/README.md` — never blanket-stage; stage only what you actually changed.
