---
date: 2026-09-08
source: session
from: Dyah
type: issue
about: no path existed to create a second superadmin user
plane: —
status: confirmed
---

## What

Dyah noticed there was no way for a superadmin to create another superadmin — checked and
confirmed a real gap, not a permissions/UI oversight: the frontend's only working create-user
flow (`AddOrUpdateUserForComp`, "add user to a company") hardcoded `isSuperAdmin: false`, and the
one backend endpoint that could set it (`AdminUsersController.CreateUser`, `POST
/api/admin/users`, already superadmin-gated) also hardcoded `isSuperAdmin: false` — and had no UI
caller at all (KAIROSTSAP-100 had moved account creation into the per-company flow, orphaning this
endpoint entirely).

Fixed: `RegisterUserDto` now carries `IsSuperAdmin` (defaults false), threaded through to
`RegisterUserAsync` instead of the hardcoded literal — safe because `CreateUser` already
`Forbid()`s any non-superadmin caller before the DTO is even read, so a company-admin can never
reach `IsSuperAdmin=true` this way. Admin Users page gets a "Super Admin" checkbox, visible only
to a superadmin viewer (the Create User dialog is shared with company-admins, who must never see
this), that skips the company picker entirely — a superadmin isn't scoped to any company — and
calls the dedicated `createUser()` API instead of the per-company loop.

## Why

A real operational gap: with exactly one superadmin account, there was no way to add a second one
(for redundancy, a new admin hire, etc.) without going around the app entirely.

## Impact

- Merged into `phase-2-build` 2026-09-08 (commit `3b72c61`, part of the 3-fix merge — see
  [[2026-09-08_dyah_three-fixes-merged-and-verified]]).
- **Rebuilt and tested on both Pilot and Live — confirmed working** (Dyah, same day).
