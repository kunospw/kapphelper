---
date: 2026-09-04
source: meeting
from: Ken
type: requirement
about: KDocVerify needs independent QA before promotion, plus a usability bar
plane: —
status: confirmed
---

## What

Dyah asked whether KDocVerify (web, reported "good, just needs finalization" by Jesynta on 4 Sept)
needs QA before it can move toward promotion/marketing. Ken confirmed: every application needs QA,
and the QA person specifically needs to test it from the point of view of someone who has **never
used the app before** — not just verifying it functions, but judging whether a customer would find
it intuitive enough to use without reading a manual. He raised the design principle of minimizing
the number of clicks/steps needed (used Mac vs. Windows as the reference example of "thought-out"
design reducing friction) as the bar to aim for.

## Why

Ken, 4 Sept meeting: he wants every app the team ships to be judged by whether a first-time,
non-expert user finds it obviously usable — that's the difference between something "ready to
sell" and something only an expert can operate.

## Impact

- KDocVerify web should get a QA pass from someone who hasn't used it before it's promoted further,
  in addition to functional testing.
- This "design for a first-time user, minimize clicks" bar was stated as a general principle for
  all apps going forward, not just KDocVerify — worth carrying into future UI/UX decisions
  team-wide (candidate for `standards/` rather than a per-app capture, if it keeps recurring).
