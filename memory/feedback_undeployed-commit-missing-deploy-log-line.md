---
name: undeployed-commit-missing-deploy-log-line
description: A commit lacking a "deployed" log line in a repo that normally logs deploys is a signal it was never rebuilt, not that it doesn't matter.
metadata:
  type: feedback
---

In repos (e.g. KairosTSApp) where every deployed change gets a line in `CHANGELOG.md` and/or
`.klaudecode/phase2_tracker.md` — "committed + pushed `<sha>`. Deployed + verified..." — a commit
that's missing that line is a real signal, not noise.

**Why:** Found on 2026-08-21 diagnosing why a user (Eileen) still saw full cross-company access
after the unassigned-user access-control fix (`19989c3`, `1af3e6e`, KAIROSTSAP-98) had already been
committed. Every other change in the tracker/changelog has an explicit "deployed" line; these two
didn't. That gap was the actual bug: the code was correct, it had simply never been rebuilt on
Pilot, so the container was still running the old behavior. No docker access existed to verify
container build time directly, so the log convention was the only available signal.

**How to apply:** Before assuming a merged/committed fix is live in a repo that follows this
"commit → deploy line" convention, `git log` the relevant file(s) and cross-check CHANGELOG.md /
the tracker for a matching deploy entry. A commit without one is worth asking "was this ever
rebuilt?" before trusting its behavior is in production — especially in advisory-deploy setups
where Claude can't run `docker compose up --build` itself and has to hand the command to the user.
