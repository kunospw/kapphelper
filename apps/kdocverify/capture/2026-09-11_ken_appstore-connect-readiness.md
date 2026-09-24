---
date: 2026-09-11
source: meeting
from: Ken
type: issue
about: KDocVerify App Store Connect / Play Store listing not ready to test
plane: —
status: confirmed
---

## What

As of 11 Sept, Jesynta reported KDocVerify ~85-90% finished, only testing left, and mobile
compilation now working via the Mac build server (see
[[use-mac-build-server-for-app-store-uploads]]). Walking through App Store Connect together, Ken
and Jesynta found several gaps blocking real testing:

- **No app icon/logo set** on the App Store Connect listing.
- **Two separate app listings exist** for what should be one product ("K Doc Verify" and a second,
  older one). Ken's call: stop using the older one; standardize on the "K Verify"-named app/bundle
  ID going forward, and the two should share the same bundle ID so they're easier to manage
  consistently (confirmed the bundle ID does match between App Store Connect and the app config).
- **Jesynta had no login of her own for `solutions@kairossolutions.co` on App Store Connect** — she
  had been relying on Dyah's help to log in. Ken walked her through 2FA recovery live in the
  meeting so she could get in.
- **TestFlight showed "Missing Compliance"** — export compliance question (standard encryption)
  hadn't been answered for the build. Fixed live: select "Standard" encryption, answer "No" to the
  France-specific question, save.
- **No internal testing group / testers configured yet** — needed before anyone (including
  Jesynta herself) can install via TestFlight.

## Why

Ken, walking Jesynta through App Store Connect live because she couldn't get a build into testable
state on her own — attributed to missing setup steps rather than app code issues.

## Impact

- Actionable: finish App Store Connect setup for KDocVerify — icon/logo, retire the duplicate
  listing, confirm shared bundle ID, add internal testers group, get Jesynta her own login access
  (not dependent on Dyah), resolve the missing-compliance flag on every future build.
- Give Jesynta her own credentials/access to `solutions@kairossolutions.co` on App Store Connect
  going forward rather than one-off help each time (Ken suggested checking with Dyah on how access
  is currently shared).

## Scrubbed

The phone number Ken used to receive the SMS 2FA recovery code during the walkthrough is not
recorded here. If App Store Connect access recovery is needed again, ask Ken directly.
