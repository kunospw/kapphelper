---
name: push-immediately-after-tested-working
description: Once a feature/fix is implemented, tested, and confirmed working, push it right away rather than batching it with later changes.
metadata:
  type: feedback
---

Don't sit on a commit once the user has confirmed a change is tested and works. Push it
immediately, rather than waiting to bundle it with whatever comes next in the session.

**Why:** Dyah's instruction (2026-08-21, TaiSin session, after confirming the login-error-display
fix worked). Letting verified work sit uncommitted/unpushed risks it getting lost, tangled with
unrelated in-progress changes, or hit by the same divergence problem covered in
[[notify-before-shared-main-push]] and `reference_project-checkouts.md` (two active TSApp
checkouts for Dyah — anything not pushed from one side is invisible to the other).

**How to apply:** As soon as a change is (a) implemented, (b) verified — tests pass, or the user
explicitly confirms it works — commit with a proper Conventional Commit message
([[commit_format]]) and push to the current branch immediately. Don't wait for "a good stopping
point" or bundle it with the next task. This applies to feature branches; `main` still needs
explicit push approval per kapphelper's hard rules.
