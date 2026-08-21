---
name: project-checkouts
description: Per-project map of where each app repo is checked out (which machines, which users, which is primary). Consult before starting work — a repo with >1 active checkout can silently diverge if you edit one without fetching first.
metadata:
  type: reference
---

Where each registered app repo lives, per active checkout. **Before starting work in any checkout, `git fetch origin` first** — silent divergence between checkouts is the #1 self-inflicted git problem.

## KConnectApp

| Checkout | User | Role | Notes |
|---|---|---|---|
| `/opt/kconnect` on `kconnect01` | `jharya` (Jesynta) — primary; `drini` side-only | Production checkout; Jesynta's daily driver | Commits authored as `Kairos Connect <solutions.briantj@kairossolutions.co>` (shared git identity on that box — NOT Brian's personal account). Also serves as the deploy checkout (`target: local` in `projects.yaml`). |
| `D:\Dee's archivest\projects\Kairos\KConnectApp` on Dyah's Windows | `dyahr` | Dyah's occasional touches | Dyah's commits here author as `kunospw <dyah.rini@student.president.ac.id>`. |

## KairosTSApp

| Checkout | User | Role | Notes |
|---|---|---|---|
| `/opt/KairosTSApp` on `tsapp` (`cloud2.kairossolutions.co:7723`) | `drini` (Dyah) | Deploy checkout; also holds Dyah's server-side Claude sessions | Commits authored as `Dyah Rini <solutions.dyahr@kairossolutions.co>`. **Remote switched from SSH to HTTPS 2026-08-21** — `origin` is now `https://github.com/Kairos-Business-Solutions/KairosTSApp.git`, authenticated via `gh auth login` as GitHub account `kunospw` (git credential helper `!/usr/bin/gh auth git-credential`, set by `gh auth setup-git`). Don't assume the old SSH deploy key still applies here. |
| `D:\Dee's archivest\projects\Kairos\KairosTSApp` on Dyah's Windows | `dyahr` | Dyah's Windows Claude sessions | Commits authored as `kunospw <dyah.rini@student.president.ac.id>`. |

**Dyah has TWO active checkouts for TSApp on herself alone** — this is the setup that caused the 2026-08-20 incident (server-side pushed, Windows didn't fetch, next Windows Sync had to auto-merge). No shared branch protection saves you from this — only fetch-first discipline does.

## Convention for new entries

When a new checkout comes into existence (new machine, new dev onboarded, second checkout of same repo by same person), add a row here. When one goes away (dev leaves, machine decommissioned), remove it — a stale entry sends people looking at ghosts.

Related: [[notify-before-shared-main-push]] (WHY this matters — divergence between checkouts silently sets up the next dev for rebase pain).
