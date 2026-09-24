---
date: 2026-09-04
source: meeting
from: Ken
type: decision
about: KDocVerify / KConnect must stop using "katelink" customer domain
plane: —
status: confirmed
---

## What

During a demo/testing session, Ken noticed KDocVerify/KConnect was still resolving under a
customer-specific domain referred to as "katelink" (a former customer account domain). Decision:
stop using that domain — use one of Kairos's own domains instead, either `kairossolutions.co` or
`ksol.ai` (the domain already used for some of the other apps, e.g. `kdocverify.ksol.ai`,
`ksupplier.ksol.ai`, `kcustomer.ksol.ai` per `projects.yaml`).

## Why

Ken, live during testing: the app should present itself under a Kairos-owned domain, not a
leftover customer domain from an earlier arrangement — both for professionalism and so the domain
doesn't depend on a customer relationship that may end.

## Impact

- Any remaining references to the "katelink" domain (config, links sent to testers, app store
  listing URLs) should be found and switched to the `ksol.ai` / `kairossolutions.co` equivalents.
- Worth a quick audit of KConnectApp config/env for the old domain before the next promotion push.
