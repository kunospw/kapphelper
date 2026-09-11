# TCS Time Entry - Only Input Needed

## Already established; no action needed from you

- Product: TCS Time Entry / Proof-of-Delivery mobile app.
- Customer: Tower Crane Services (TCS), within the Tiong Woon group.
- Mobile source repository: `Kairos-Business-Solutions/KTime-POD-Mobile-TCS`.
- Confirmed active branch at inspection: `main`; inspected HEAD `d2a15363` (2026-09-01).
- Android package ID: `com.kairos.kairos_time_entry_tw`.
- iOS bundle ID: `co.kinetictimeentry.app`.
- Inspected app version/build: `1.0.45+114`.
- Shared backend repository: `Kairos-Business-Solutions/KairosWeb`.
- Documented backend branch: `TWPC-TC` (must be verified against the active deployment before a
  release).
- Stack: Flutter/Dart + Firebase.
- Platforms: Android and iOS.
- Historical testing/pilot API references have been captured from the project overview; they will
  not be treated as the current production target without verification.
- Safety rule from the meeting: any change first goes to the agreed non-production lane; it does
  not go to production until the target client verifies it.

## Please fill only these items

| Needed fact | Your answer | Why it is needed |
|---|---|---|
| Mobile branch currently used for TCS | `main` (inspected at `d2a15363`) | Prevents release from an incorrect branch. |
| Confirmed API URL for a TCS **internal/test** build | `TCSTHIRD`: `https://cloud2.kairossolutions.co/kairostimeentryTCSTHIRD/swagger/index.html`; actual configured app URL still must be confirmed at login | Prevents a build pointing at the wrong customer/environment. |
| Confirmed API URL for a TCS **production** build, if one is allowed | `TCS live`: `https://twapi.kairossolutions.co:54/api`; not compiled as a dedicated app default | Required to distinguish test from live. |
| Android package ID | `com.kairos.kairos_time_entry_tw` | Must match the selected Play Console app. |
| Correct TCS Play Console URL | `https://play.google.com/console/u/3/developers/9133920884816704217/app/4974819105928295946/app-dashboard` | Store destination must be explicit. |
| Android lane permitted today | Internal testing is active; production also has a release. **Policy permission for a new production release remains unconfirmed.** | Release guardrail. |
| iOS bundle ID | `co.kinetictimeentry.app` | Must match the selected App Store Connect app. |
| Correct TCS App Store Connect URL | `https://appstoreconnect.apple.com/apps/6505063249/distribution/ios/version/deliverable` | Store destination must be explicit. |
| iOS lane permitted today | TestFlight has internal and external tester groups; iOS version `1.0.42` is Ready for Distribution. **Policy permission for a new App Store production release remains unconfirmed.** | Release guardrail. |
| Who approves a TCS release plan before upload | | Human approval is required before risky actions. |
| Minimum test evidence before upload | | Makes "tested" verifiable. |

## Recorded environment references

These are source references supplied by the team. They are not evidence that a mobile build is
safe to release until the selected build's configured base URL is verified.

| Label supplied | Purpose supplied | API/service reference | Related Epicor reference |
|---|---|---|---|
| `TCSTHIRD` | Developer testing | `https://cloud2.kairossolutions.co/kairostimeentryTCSTHIRD/swagger/index.html` | `https://seasiadtadtl06.epicorsaas.com/SaaS579third/apps/erp/home/#/home?company=165746B&site=MfgSys` |
| `TCS pilot` | Pilot | `https://twapi.kairossolutions.co:56/api` | `https://seasiadtpilot07.epicorsaas.com/SaaS579Pilot/Apps/ERP/Home/#/home?company=165746B&site=MfgSys` |
| `TCS live` | Live | `https://twapi.kairossolutions.co:54/api` | needs verification |
| `TCSPILOT` | Internal company testing (`TestMode`) and live, as supplied | `https://cloud2.kairossolutions.co/kairostimeentryTCS/swagger/index.html` | `https://seasiadtpilot07.epicorsaas.com/SaaS579Pilot/Apps/ERP/Home/#/home?company=165746B&site=MfgSys` |

**Verification required:** `TCSPILOT` is described as both internal company testing and live.
Before any release, confirm its intended mobile lane and the exact base URL compiled into the app.

## Inspected mobile configuration - 2026-09-04

Source: read-only inspection of `KTime-POD-Mobile-TCS` at `main` / `d2a15363`. The repository
working tree was not verified because the inspection environment could not run `git status`.

### How the app selects its API URL

- The login screen accepts a user-entered `customUrl`. If blank, it uses the hard-coded default
  `https://twapi.kairossolutions.co/api`.
- The chosen URL is stored in SharedPreferences per derived tenant ID and then read by later app
  sessions as the base URL.
- The TCS/TWPC API route selection is inferred from the URL string. TCS detection includes
  `kairostimeentrytcs`, `twapi.kairossolutions.co:54`, and `twapi.kairossolutions.co:56`.

### Release blockers / risks found

1. **Do not leave the login URL blank for TCS.** The blank/default URL does not match the app's
   TCS marker list and therefore uses the generic/TWPC endpoint. The repository comment records
   that this default was changed from TCS `:54` to TWPC on 2026-09-01 and intended for
   TestFlight-only use until confirmed safe.
2. **TCSTHIRD is not explicitly modelled.** It currently receives TCS routing because its path
   happens to contain the substring `kairostimeentrytcs`; this is not a stable configuration
   contract.
3. **The `testUrl` constant is unused** and a second default URL is duplicated in the change-PIN
   screen. A future change can make the two drift.
4. **The correct mobile lane is still unconfirmed.** The profile needs the Play Console/App Store
   Connect destination and permission state before any distribution action.

### Required test evidence for a TCS build (proposed)

- Record the exact login/API URL selected in the build test.
- Verify a TCS user sees the TCS workflow/data and not TWPC/generic data.
- Exercise the changed workflow plus login and a basic regression path.
- Record app version/build, tester, date, and result in the Plane issue or handover.
- Obtain the named approval for the selected distribution lane.

## Store evidence - 2026-09-04

Captured from the team Play Console and App Store Connect views. This evidence identifies the
store records and current published/uploaded state; it does **not** approve a new release.

| Platform | Store record | Verified state |
|---|---|---|
| Android | **Kairos Time Entry TW**; package `com.kairos.kairos_time_entry_tw` | Package matches the inspected TCS repository. Production has a latest release dated 2026-08-21. Internal testing is active: version `1.0.42 (110)` was available to internal testers on 2026-08-20; an untitled draft release also exists. |
| iOS | **Kinetic Time Entry**; App Store Connect Apple ID `6505063249`; bundle `co.kinetictimeentry.app` | Bundle ID matches the inspected TCS repository. iOS version `1.0.42` is Ready for Distribution. TestFlight has internal group `KairosTimeEntry` and external group `ExternalTesting`. Build `1.0.45 (114)` uploaded 2026-09-01 and shows Complete. |

### Important interpretation

- Android app name `Kairos Time Entry TW` and iOS app name `Kinetic Time Entry` are shared or
  group-level labels; neither name proves which client/environment a particular build will use.
- A build being **Complete** in TestFlight, or an internal testing track being active, does not
  itself authorise a new production release.
- For every release, record the branch, build version, selected API URL, target client, tester
  group/track, test evidence, and named approval together.

## If you do not know an answer

Write `needs verification` and, if known, the person or console that can confirm it. I will use
that to create the verification task rather than guessing.
