# TWPC Time Entry - Only Input Needed

## Already established; no action needed from you

- Customer: Tiong Woon Projects and Contracting (TWPC), within the Tiong Woon group.
- It is a separate customer/release destination from TCS, even where source code or infrastructure
  is shared.
- The project overview identifies `Kairos-Business-Solutions/KairosWeb` branch `TWPC-TC` in the
  related TCS/TWPC logistics work; this relationship must be verified before release work.
- Safety rule from the meeting: test the correct company and non-production lane before any
  production distribution.

## Please fill only these items

| Needed fact | Your answer | Why it is needed |
|---|---|---|
| TWPC mobile repository URL | `https://github.com/Kairos-Business-Solutions/KTime-POD-Mobile-TWPC` | Identifies the correct source app. |
| Mobile branch currently used for TWPC | `nazmitest` | Prevents release from an incorrect branch. |
| Shared backend repository + branch, if different from `KairosWeb/TWPC-TC` | | Makes dependency explicit. |
| Confirmed API URL for a TWPC internal/test build | `https://cloud2.kairossolutions.co/kairostimeentry/swagger/index.html` | Prevents cross-client testing. |
| Confirmed API URL for a TWPC production build, if one is allowed | `https://cloud2.kairossolutions.co/kairostimeentry/swagger/index.html` (same URL supplied) | Required to distinguish test from live. |
| Android package ID, if Android exists | | Must match the selected Play Console app. |
| Correct TWPC Play Console URL, if Android exists | | Store destination must be explicit. |
| Android lane permitted today | internal testing / closed testing / production / blocked / not applicable | Release guardrail. |
| iOS bundle ID, if iOS exists | | Must match the selected App Store Connect app. |
| Correct TWPC App Store Connect URL, if iOS exists | | Store destination must be explicit. |
| iOS lane permitted today | TestFlight / App Store production / blocked / not applicable | Release guardrail. |
| Who approves a TWPC release plan before upload | | Human approval is required before risky actions. |
| Minimum test evidence before upload | | Makes "tested" verifiable. |

## Verification required

The supplied TWPC endpoint is labelled both **Live Env** and **Internal Company Testing**. Before
any mobile release, confirm whether this is one environment with a test mode, distinct lanes behind
the same URL, or a label mismatch. The release profile must not treat the two purposes as
interchangeable.

## If you do not know an answer

Write `needs verification` and, if known, the person or console that can confirm it. I will use
that to create the verification task rather than guessing.
