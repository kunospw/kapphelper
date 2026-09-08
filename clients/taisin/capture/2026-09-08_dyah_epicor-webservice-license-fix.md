---
date: 2026-09-08
source: session
from: Dyah
type: decision
about: Epicor license type — claim Web Service instead of DefaultUser
plane: —
status: confirmed
---

## What

Root cause found for a production error on Live: `Maximum users exceeded on license type:
DefaultUser assigned to company: LKHE`, surfaced via the `K_InvcHeadSync` sync BAQ
(`/server/api/v2/odata/LKHE/BaqSvc/K_InvcHeadSync/Data?pCompany=EG&...`). Live's Epicor license
pools: DefaultUser 157 active / 160 max (near-exhausted); Web Service Users 0 active / 3 max
(provisioned, entirely unused). Every Epicor REST call this app makes was implicitly claiming
DefaultUser — there was no `License` header at all.

Ken's team (client-side) instructed: make the integration claim the Web Service license instead,
since Live has far more DefaultUser accounts than the pool supports but the Web Service pool sits
idle.

Implemented as `EpicorLicenseHandler`, a `DelegatingHandler` registered on the named `"Epicor"`
`HttpClient` (`Program.cs`), stamping every outgoing request with
`License: {"ClaimedLicense":"<guid>"}`. Had to be a `DelegatingHandler` specifically, not a header
set on `HttpClient.DefaultRequestHeaders`: three call sites in `EpicorService.cs`
(`GetInvoiceMetadataAsync`, `TestCredentialsAsync`, `GetOrdersMissingPoAsync`) call
`client.DefaultRequestHeaders.Clear()` before setting their own Authorization/x-api-key, which
would wipe a header set that way — a `DelegatingHandler` runs downstream of that, on the actual
outgoing `HttpRequestMessage`, so it can't be cleared by a call site.

Verified against every one of the 14 places the app creates the named `"Epicor"` client before
implementing — nothing bypasses it, so one handler covers all Epicor traffic: `K_InvcHeadSync`,
`SubmitToAgent`, `K_GetRptData`, `K_GetInvcDetails`, `K_GetInvcRelFiles`, `K_CustInvcOptions`,
`Ice.BO.AttachmentSvc` (download + DocStar upload), `Erp.BO.SalesOrderSvc`.

Configured via `Epicor:LicenseGuid` / `Epicor__LicenseGuid` (appsettings.json + both
docker-compose files) — the standard Epicor Web Service User license type GUID
(`00000003-9439-4B30-A6F4-6D2FD4B9FD0F`), not tenant-specific, not a secret. Empty/missing
preserves prior behavior (no header) plus a once-at-startup warning.

## Why

DefaultUser exhaustion was actively breaking Live's sync (K_InvcHeadSync failing outright), and
the fix has to be code-side — Ken's team explicitly ruled out touching Epicor server/license
settings, user accounts, or DefaultUser licensing itself. The Web Service pool was sitting fully
provisioned and unused, so pointing the integration at it needed no Epicor-side change at all.

## Impact

- Merged into `phase-2-build` 2026-09-08 (commit `a40194f`, part of the 3-fix merge — see
  [[2026-09-08_dyah_three-fixes-merged-and-verified]]).
- **Rebuilt and tested on both Pilot and Live — confirmed working** (Dyah, same day).
- If this pool also fills up eventually (3 Web Service licenses, same growth pattern as
  DefaultUser), the fix is a one-line config change (`Epicor__LicenseGuid`) to point at a
  different license type — no code change needed.
