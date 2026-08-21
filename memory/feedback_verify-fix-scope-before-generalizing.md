---
name: verify-fix-scope-before-generalizing
description: Before fixing a duplicate/race/concurrency bug, confirm exactly which repetitions are the actual problem — not every repetition of an action is unwanted.
metadata:
  type: feedback
---

When a bug report sounds like "X happens twice and shouldn't," don't assume *all* repetitions of X
are the bug. Nail down the precise trigger first — often only *one specific kind* of repetition
(e.g. two overlapping runs of the same action) is wrong, while a *different* kind of repetition
(e.g. the same action run again later, deliberately) is intended and must keep working.

**Why:** On KairosTSApp (2026-08-20), a user reported a refresh-mid-generate leaving a duplicate
PDF in Google Drive. The actual root cause was real: `UploadPdfToDriveAsync` was a blind
`Files.Create` with no lookup, so two *overlapping* generate calls for one invoice (refresh +
reclick, double-click, two tabs) each uploaded independently. The first fix attempt generalized
too far — delete any existing same-named file before every upload — which silently destroys the
version history that a **separate, later** regenerate is supposed to leave behind. The user caught
it immediately: *"duplicates are allowed in case there's updates n stuff... what's not allowed is
twice in one run."* The correct fix was a per-invoice mutex blocking only concurrent/overlapping
calls, leaving deliberate later regenerates untouched. The over-corrected version was live and had
to be reverted same-day.

**How to apply:** Before writing a "prevent duplicate X" fix, ask (or infer from the actual
complaint) which axis the duplication has to be scoped on — same request vs. same session vs. same
day vs. ever. A fix that's too narrow under-protects; a fix that's too broad quietly deletes
legitimate state. When in doubt, the narrower scope (block only genuine concurrency/races) is
almost always safer to ship first than the broad one (dedupe on every occurrence), since the broad
one is much harder to notice has gone wrong until real data is already lost.
