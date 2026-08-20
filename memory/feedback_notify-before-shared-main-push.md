---
name: notify-before-shared-main-push
description: Before pushing to a shared repo's main branch, check if another dev has uncommitted WIP on that repo — and ping them first if so. Prevents surprise merge conflicts and lost work on their side.
metadata:
  type: feedback
---

Before running `git push` (or clicking VS Code "Sync Changes") on a **shared repo's main branch**, first check: does another dev have uncommitted WIP or unpushed commits on their own checkout of this repo? If yes, **ping them first** (WhatsApp / Slack) before pushing.

**Why:** 2026-08-20 KConnect incident. Dyah pushed 3 commits + 1 merge to `origin/main` from her Windows checkout of KConnectApp. She didn't know Jesynta had `/opt/kconnect` on `kconnect01` in a mid-work state — 4 unpushed commits + 9 modified files, several of which (`docs/CHANGELOG.md`, `ApprovalTree.jsx`, `UsersManager.jsx`, `adminController.js`, `packageController.js`, `routes/admin.js`) overlapped with what Dyah's merge commit brought in. Jesynta was off that day — Monday she'll hit non-fast-forward rejection on her push, need to `git pull --rebase`, and face 6+ file merge conflicts on WIP she was still shaping. Fixable, but painful and preventable with a 30-second WA message.

**How to apply:** Any push to a `main`/`master`/long-lived shared branch of a repo where >1 dev is active. Check `git log --author=<other-dev>` and the shared checkout's `git status` (via SSH if remote) if you know one exists — the [[project-checkouts]] reference tracks who has which checkout where. If they have WIP, message them: "aku mau push N commit ke main sekarang, kamu bakal perlu `git pull --rebase` next time. File X/Y/Z bakal conflict." Not a request for permission — a heads-up so they aren't blindsided.

Related: [[git-sync-button-danger]] (VS Code Sync bundles pull+push without visibility, makes this trap easier to fall into).
