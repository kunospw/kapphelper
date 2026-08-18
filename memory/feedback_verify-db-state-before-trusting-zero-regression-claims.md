---
name: verify-db-state-before-trusting-zero-regression-claims
description: When a build step's safety argument depends on "the data is currently blank/unused," query it — don't infer it from conversation history or screenshots.
metadata:
  type: feedback
---

When implementing a change whose safety rests on a claim about current data state (e.g. "every row
in this table is blank today, so making it the first source is zero-regression"), that claim must
be verified with an actual read query against the live data before deploying — not inferred from
earlier conversation, a screenshot, or "we never filled that in."

**Why:** During KairosTSApp's Epicor-credentials-in-DB work ([[kairos-epicor-credentials-plan]]),
step 3 made the `Comp` DB row the first-checked source for Epicor credentials, ahead of the
previously-working env-var fallback. The justification — "every Comp row's credential columns are
blank today" — was asserted based on what earlier messages in the session implied, never checked
with a `SELECT`. It was wrong: one row (`LKHE`) already had stale, complete
(wrong-but-non-blank) credentials sitting in it from unknown earlier testing, and because the
app's invoice sync always resolves credentials through that one company code (a cross-company BAQ
owned by LKHE), that single bad row broke sync for *every* company at once — a uniform 401 outage
across a live-ish deployment, caused entirely by a false assumption, not a logic bug. The resolver
did exactly what it was designed to do; the input data was never actually inspected.

**How to apply:** Any time a change description includes "this is safe because X is currently
empty/unused/default," treat that as a claim to verify, not a fact to state. Run the read query
(or ask the person with DB access to run it) *before* the deploy that depends on it, not after
something breaks. This applies especially in shared/multi-tenant lookups where one bad row can be
silently reused across many logical entities (like the cross-company BAQ here) — the blast radius
of one stale row can be much larger than it looks from the schema alone.
