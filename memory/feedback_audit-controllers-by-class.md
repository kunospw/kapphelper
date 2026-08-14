---
name: audit-controllers-by-class
description: When auditing authorization/access-control coverage in a codebase, list classes not files — a single file can hold multiple controller classes with different routes and different guards.
metadata:
  type: feedback
---

When checking whether an endpoint or a whole feature area has proper authorization, enumerate
**classes**, not **files**. A file listing or a `grep` by line number cannot tell you which class in
a file a match landed in.

**Why:** Found twice in the same session on KairosTSApp (2026-08-13/14). `Controllers/AdminCompController.cs`
holds two separate controller classes — `AdminCompController` (org-scoped, properly gated with
`CanAccessOrgAsync`) and `AdminCompConfigController` (global, and for a while had only a bare
`[Authorize]` — no further check, so any authenticated user could read/write Epicor credentials for
any company). An earlier audit pass in the same session wrongly concluded the second class "no longer
existed" because a grep by line number couldn't distinguish which class a hit belonged to — the
correction had to be made explicitly in the plan doc afterward.

Same session, same pattern: `AdminCompUsersController` (a *different*, single-class file) also
shipped with no authorization check beyond `[Authorize]` — any logged-in user could assign/remove
company access for anyone. This wasn't a class-boundary confusion, but the same root behavior
(assuming `[Authorize]` alone means "properly gated") produced the same class of bug twice in one
session.

**How to apply:** Before declaring an admin/controller area "covered," open each controller class
individually (`grep -n "^\[ApiController\]\|^public class.*Controller" <file>` to enumerate classes
per file, not just files) and confirm each one has more than the bare `[Authorize]` — a role check,
an org/company-scope check, or an explicit "this is intentionally open to any authenticated user"
comment. Apply this to any codebase with multiple controller classes per file, not just
KairosTSApp specifically.
