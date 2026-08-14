---
date: 2026-08-13
source: whatsapp
from: Iwan
type: decision
about: KairosTSApp per-company user access model (Track A)
plane: KAIROSTSAP-87
status: confirmed
---

## What

Iwan specified the full access model for restricting users to their assigned company/companies, in
the BR120 - AR Automation group chat:

> "user assigned to one or more company, admin will have access to that company assigned (example,
> able to set or add user), superadmin able to see all company and more config setting, ie the
> google drive link, etc."

Restated back to him for confirmation and confirmed "yes correct". Three-tier model:

| Role | Scope |
|---|---|
| **User** | One or more assigned companies. Sees only those. |
| **Admin** | Also limited to assigned companies, but can manage users within them (add/set user). |
| **Superadmin** | All companies, plus config settings (Drive link, Epicor settings). |

Also stated explicitly: **a user must be assigned to at least one company** — "unassigned" is not
meant to be a valid long-term state.

Test assignments Iwan supplied for verification: Zexuan Chong → LKHE, Carol Koh → LKHE, David Chua →
LKHP (account already created by him), Stella Tan → both LKHE and LKHP, as admin.

Acceptance criterion, from the earlier 6 Aug BR120 meeting (39:47 in the recording):

> "if the company set up is really there, they cannot see each other company, then we will add the
> KHP users and to do the testing."

LKHP user onboarding is explicitly gated on companies genuinely not seeing each other's data — not
on a cosmetic UI filter.

## Why

Iwan (client PM, Group IT at Tai Sin) raised this as a go-live blocker: the app currently has no
company-level access restriction — any logged-in user can query any of the six companies' invoice
data through the API, regardless of what the frontend dropdown shows. He wants LKHE users live first,
then LKHP onboarding contingent on this working.

## Impact

Directly shaped the implementation (`CompUser.IsCompAdmin` maps to the "admin" tier;
`Authorization:UnassignedUsersSeeAllCompanies` config flag exists specifically because "must be
assigned to at least one company" makes the eventual end-state "unassigned = no access", not
"unassigned = full access" forever). Built and verified end-to-end on Pilot 2026-08-14 — real test
logins for all four named users confirmed the correct cross-company 200/403 behavior, matching this
model exactly. Full build detail lives in `KairosTSApp`'s own `CHANGELOG.md` and
`docs/password-management-plan.md` (not duplicated here — see that repo, branch `phase-2-build`).

Also surfaces a scope question worth revisiting with Ken: KAIROSTSAP-87 is currently scoped "medium
priority, gates the KHP phase, not first go-live" — but Iwan raised it as a pre-go-live query and has
already supplied test users expecting it to be exercised, so that priority framing looks outdated.
