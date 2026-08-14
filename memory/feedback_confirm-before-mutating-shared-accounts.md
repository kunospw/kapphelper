---
name: confirm-before-mutating-shared-accounts
description: Before resetting passwords, deleting, or otherwise mutating any account/record during testing, confirm it isn't in active real-world use — don't assume "I just created it for testing" extends to every account with a similar name or role.
metadata:
  type: feedback
---

When testing a feature that touches user accounts (password resets, role changes, deletions),
confirm an account is actually a test/throwaway account — created by you, this session, for this
purpose — before mutating it. Don't assume every account matching the test scenario (e.g. "the four
named test users") is safe to touch just because some of them are.

**Why:** During KairosTSApp Track A testing (2026-08-14), reset the passwords of 4 real client-side
accounts (Zexuan, Carol, David, Stella — plus Iwan's, for consistency) via the API to run an
end-to-end verification. These turned out to be live accounts real people were actively using at
that moment, not disposable test accounts — the user had to supply the original passwords so they
could be restored. The accounts existed *because* Iwan had specifically asked for test assignments
using named real people (not because they were throwaway seed data), which should have been the
signal to ask before mutating rather than after.

**How to apply:** Before running a destructive or credential-changing action against an account
during testing — especially one a client stakeholder named or created themselves — ask "is this
account currently in use by a real person, or did I create it for this test?" If unsure, ask the
user first rather than proceeding and asking forgiveness. This applies beyond KairosTSApp: any
session where "test accounts" and "real accounts" share the same table and naming convention.
