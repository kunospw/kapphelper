# KAppHelper

Shared Claude workspace for Kairos custom-app development (non-Epicor side). Holds context,
memory, standards, skills, and a registry that ties them to real repos and servers. Sibling of
`KEpicorHelper`.

Team: Dyah + Jesynta (both software dev interns).

---

## Quickstart

**On Jesynta's server (`kconnect01`):**

```bash
cd ~/klaudecode                    # per Ken's rule
git clone git@github.com:Kairos-Business-Solutions/kapphelper.git
cd kapphelper
./bootstrap.sh
```

**On Dyah's Windows machine (Claude Code):**

```powershell
cd $HOME\klaudecode                # per Ken's rule
git clone git@github.com:Kairos-Business-Solutions/kapphelper.git
cd kapphelper
.\bootstrap.ps1
```

Same repo, two checkouts, synced via GitHub. Bootstrap is idempotent — safe to re-run.

## Using it

Start a `claude` session from `~/klaudecode/kapphelper/`. The `session-start` skill fires
automatically:

1. Pulls latest from GitHub
2. Reads `projects.yaml` to see which apps/clients are registered
3. Asks which one you're on (or takes it from the request)
4. Reads that project's `APP.md`/`CLIENT.md` + recent captures + app-repo git state
5. Prints a briefing

Then you work as normal. When you learn something durable — a Ken decision, a meeting note, a
screenshot from the client — the `capture` skill (coming Week 2) writes it into
`apps/<slug>/capture/` or `clients/<slug>/capture/`.

## Repo layout

```
kapphelper/
├── CLAUDE.md                       # rules Claude reads first — start here
├── README.md                       # this file
├── projects.yaml                   # registry of apps + clients + deploy targets
├── bootstrap.sh, bootstrap.ps1     # one-time machine setup
├── apps/                           # internal Kairos products
│   └── kdocverify/
│       ├── APP.md                  # what/why/phase/owners
│       ├── baseline/               # frozen source-of-truth docs
│       └── capture/                # append-only decision/meeting notes
├── clients/                        # external engagements (empty for now)
├── memory/                         # durable cross-project lessons
├── standards/                      # Kairos engineering standards
└── .claude/skills/
    └── session-start/              # orient at session start
```

## Deeper reference

- **`docs/using-kapphelper.md`** — day-to-day usage: session flow, adding content, multi-writer git flow with conflict recipes, onboarding a new machine, ideas for extension.

## Rules that matter most

Full list in `CLAUDE.md`. The two that trip people up:

1. **Never write memory inside an app repo.** If you learn something while working in
   `KConnectApp/` or `KairosTSApp/`, write it *here* — `memory/`, or the relevant `capture/`.
   That is why this repo exists.
2. **Sync via git, both ends.** `session-start` pulls, `handover` pushes. Never edit stale.

## Adding a new project

1. Copy the template block at the bottom of `projects.yaml`, rename `<slug>`, fill in.
2. Create `apps/<slug>/APP.md` (or `clients/<slug>/CLIENT.md`) — see `apps/kdocverify/APP.md`
   as a worked example.
3. Create `apps/<slug>/{baseline,capture}/` folders.
4. Commit + push.

## Status

**Week 1** deliverables landed (2026-08-12): registry + bootstrap + `session-start` skill +
`deploy` skill. KDocVerify fully populated; TSApp fully populated (both pilot + live stacks,
with Dyah's actual command patterns encoded). TWL, Sushi Tei, Galvins, KConnect Portals seeded
as skeletons — fill in their `deploy:` block when work on them starts.

**Verified via SSH (2026-08-12):** `tsapp` alias (`cloud2.kairossolutions.co:7723`) reaches the
TSApp box; `/opt/KairosTSApp` is the deploy path; `drini` needs `sudo` (password required) for
docker — so TSApp deploys run in `mode: advisory` (Claude prepares command, user runs).

**Not yet built:** `capture` skill, `handover` skill, `memory/` seeded from existing
`.klaudecode/` folders.
