# Using kapphelper

Practical reference for day-to-day work. Complements `README.md` (setup) and `CLAUDE.md` (hard rules for Claude).

## What kapphelper provides

Four things that work together:

1. **Skills** — packaged procedures Claude runs on request:
   - `/session-start` — pulls kapphelper, resolves current project, reads registry + recent captures + app-repo git state, prints briefing
   - `/deploy <project> <stack>` — reads deploy config from `projects.yaml`, runs non-privileged pre-flight, hands sudo command to user (advisory mode) or executes (executed mode, if configured)
   - `/capture` — turns ad-hoc info (meeting note, decision, screenshot, email) into properly-formatted capture file. Scrubs credentials. Drafts Plane issue if actionable (never auto-creates).
   - `/handover` — surfaces uncaptured durable info from the session, commits kapphelper changes, pushes to GitHub. Advisory-only for app-repo pushes.
   - `/plane-sync` — queries Plane for the current project's open/urgent/recently-changed issues, cross-references with existing captures, proposes captures for gaps. Read-only to Plane; drafts captures for user approval before writing.

2. **Registry (`projects.yaml`)** — single source of truth for every custom-app project: server hostname, deploy path, ports, health checks, contacts, credential locations (references only — never values).

3. **Memory (`memory/`)** — durable cross-project lessons that persist across sessions and machines. Every memory file has frontmatter (`name`, `description`, `type`) and lives one-topic-per-file. `MEMORY.md` is the index.

4. **Standards (`standards/`)** — Kairos-wide engineering conventions (commit format, branch model, CRLF gotchas). Sourced from the master `Kairos_Dev_Knowledge_Handbook.md`.

## Typical session flow

```
1. Start Claude in ~/klaudecode/kapphelper/ (or any registered app repo)
2. /session-start                     → briefing
3. Do the work (edit code, run tests, whatever the project needs)
4. Mid-session: /capture              → whenever info comes up worth persisting
5. /handover                          → wrap up, push everything to GitHub
```

`session-start` on the OTHER machine will now see everything `handover` pushed.

## Adding content

| Kind of info | Where it goes | Skill or manual? |
|---|---|---|
| Meeting note, decision, email, screenshot tied to one project | `apps/<slug>/capture/` or `clients/<slug>/capture/` | `/capture` |
| Durable lesson that applies across projects | `memory/feedback_*.md` | manual — direct file write |
| New project registration | `projects.yaml` + `apps/<slug>/APP.md` (or `clients/<slug>/CLIENT.md`) | manual — direct edits |
| New engineering convention | `standards/<stack>.md` | manual |
| Deploy target change (server pindah, port berubah, new health endpoint) | `projects.yaml` `deploy:` block | manual |

Rule of thumb: **if the info would restate what git or Plane already knows, don't write it.** Kapphelper exists to enforce that boundary.

## Multi-writer git flow (2+ devs sharing kapphelper)

Kapphelper is designed to be shared. Two developers can both `git pull` at session start and `git push` at handover without stepping on each other, because most changes are naturally non-conflicting:

| File pattern | Conflict risk | Why |
|---|---|---|
| `apps/*/capture/YYYY-MM-DD_person_topic.md` | Near-zero | Filename per-timestamp per-person; new files never overlap |
| `memory/feedback_<topic>.md` | Low | One topic per file; conflict only if two devs create files with the same topic simultaneously |
| `memory/MEMORY.md` (index) | **Medium** | Everyone appends; two appends at the same time = merge conflict |
| `projects.yaml` | **Medium** | Single file; two edits to same section = conflict (rare in practice — usually different projects) |
| `apps/*/APP.md`, `clients/*/CLIENT.md` | Medium | Same file, section-level edits; append usually safer than edit |
| `standards/*.md`, `CLAUDE.md`, `README.md` | Low | Structural docs change rarely |

### Conflict resolution recipe

When `git push` is rejected with non-fast-forward:

```bash
git pull --rebase origin main
# If clean: git push origin main
# If conflict: fix, git add <file>, git rebase --continue, then push
```

**In `MEMORY.md` index:** always keep both sets of entries. Both memories are valid.

**In `projects.yaml`:** manually merge — most edits are to different project sections, so pick both sides.

**In a `capture/` file:** shouldn't happen (append-only, per-timestamp filenames). If it does, someone violated the append-only rule; write a new capture referencing the old one instead of forcing a merge.

**In an `APP.md`/`CLIENT.md`:** section-by-section merge. If both changed the same section, the newer intent usually wins — but check with the other dev first.

**Never `git push --force`** to `main`. Feature branches are OK, main is shared.

### Best practices

1. **`/handover` often, not once a week.** Small commits = small conflicts.
2. **`/handover` pulls first before push** — catches divergence early. The skill enforces this; if you push by hand, do it manually.
3. **Communicate during registry churn.** If both devs actively edit `projects.yaml` in the same day, message each other.
4. **Append vs edit for prose.** In `APP.md`/`CLIENT.md`, prefer appending new sections over rewriting old ones — reduces merge friction.

## Onboarding a new machine (or new dev)

Checklist before another machine clones kapphelper:

1. **Repo access.** kapphelper is currently private under `kunospw/`. To grant access:
   - Add as collaborator: `gh repo edit kunospw/kapphelper --add-collaborator <github-username>`
   - Or transfer to org: `gh repo transfer kunospw/kapphelper Kairos-Business-Solutions` (irreversible without org owner permission — usually needs Ken)

2. **Platform-specific paths in `projects.yaml`.** Any `credentials_ref: "D:/..."` or Windows-only paths won't resolve on Linux. Convert to platform-agnostic:
   - `credentials_ref: "1Password entry 'Kairos-Projects-Overview'"`
   - `credentials_ref: "Ken via WhatsApp"`
   - `mobile_deploy_guide: "shared Google Drive / see Ken"`

3. **Handbook reference.** `standards/README.md` points to `Kairos_Dev_Knowledge_Handbook.md` living outside kapphelper. Note where the new dev can obtain it (Ken, shared drive, etc).

4. **Missing `CLIENT.md`/`APP.md` skeletons.** If the new dev will primarily work on a project not yet documented (e.g. `kconnect_portals` had no `CLIENT.md` when Jesynta first cloned), bootstrap at least a skeleton so `/session-start` on that project has something to read.

5. **SSH aliases and deploy targets.** Skills use `deploy.target` (`local` vs `ssh`) from `projects.yaml`. Confirm the new machine's per-user SSH alias convention matches, or update `ssh_aliases:` block to be user-relative.

6. **Credential helper for git.** New dev needs authenticated `git push` for kapphelper. Options:
   - `git config --global credential.helper store` + one manual push (token cached to `~/.git-credentials` at 0600)
   - Install `gh` CLI + `gh auth login` (cleaner, browser device-code flow)
   - SSH key added to GitHub account (works with `git@github.com:` remote URL)

## Extending kapphelper

Ideas for future skills that would fit the pattern:

- **`/rotate-secrets`** — walk through fixing a credential leak flagged in `projects.yaml.known_credential_leaks`
- **`/onboard-app <slug>`** — scaffold a new project: append to `projects.yaml` from template, create `APP.md`/`CLIENT.md` skeleton, create `baseline/` + `capture/` dirs
- **`/promote-to-org`** — checklist runner for moving kapphelper from personal to Kairos-Business-Solutions org

Structural extensions:

- **Per-app-repo `CLAUDE.md`** — put a small `CLAUDE.md` at each app repo root (e.g. `/opt/KairosTSApp/CLAUDE.md`) that points back to kapphelper. Ensures rules load even when Claude is invoked from the app repo, not kapphelper.
- **Standards sub-files as patterns crystallize** — `standards/dotnet.md`, `standards/docker-compose.md`, `standards/flutter.md`, etc.
