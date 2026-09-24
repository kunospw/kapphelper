---
date: 2026-09-01
source: meeting
from: Ken
type: issue
about: TCS mobile app "broken" incident — was a URL misconfiguration, not an app bug
plane: —
status: confirmed
---

## What

The TCS time-entry mobile app appeared broken to the customer. It took a full day to resolve: the
app code itself was fine — the issue was that its configured API URL was pointing at the wrong
place (wrong environment/company). Zikria (customer side) was reluctant to let anyone touch the
API, saying the app had had no errors in two years; Dyah was accordingly hesitant to change it as
a workaround, then discovered (with help from Ricky) that the underlying cause was the app/URL
config. Ken separately found and fixed the same root cause himself by systematically testing
instead of guessing, using AI to walk through hypotheses ("what to test next, how to confirm
nothing else breaks") rather than trusting instinct.

Ken's related process point, raised in the same conversation: **don't push builds straight to
production** — always route new builds through internal testing / TestFlight-equivalent first and
get explicit confirmation before promoting to production, so an incident like "customer sees a
broken app" doesn't reach them before the team has verified it.

Dyah's own follow-up commitment: double-check which company/environment (TCS vs. TWPC) she's
testing against before diagnosing, since mixing them up delayed catching this one.

## Why

Ken, 1 Sept meeting — frustrated that a config issue took a full day and that no one else on the
team could diagnose it, despite the fix ultimately being simple once correctly isolated (change one
URL). He used it to reinforce using AI methodically (many small verification questions) rather than
making a change and hoping.

## Impact

- Reinforces the "route through internal/test track before production" rule already implicit in
  kapphelper's deploy guidance — worth applying explicitly to TWL/TCS/TWPC mobile releases too.
- Motivates the TWPC/TCS merge-into-one-app decision — see
  [[2026-09-04_ken_merge-twpc-tcs-decision]] — Ken's stated reason includes wanting a single,
  better-designed app instead of two separately-maintained ones that are each hard to reason about
  when something breaks.
