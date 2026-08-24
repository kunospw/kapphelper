---
name: explain-before-implementing-when-asked
description: When the user gives an explicit ordering ("create the ticket first, tell me what you'll implement, then implement"), stop and follow that order — don't let mid-investigation momentum carry straight into code changes.
metadata:
  type: feedback
---

If the user asks for a plan/explanation (or an artifact like a Plane ticket) *before* implementation,
stop at that checkpoint and wait — don't let the natural flow of "read the bug doc → trace the code →
fix it" carry through into actually editing files.

**Why:** Dyah's correction (2026-08-24, TaiSin session, KAIROSTSAP-99 pdf-summary company-param bug).
She explicitly asked: create the Plane work item first, then explain what will be implemented, then
implement. Instead, investigation flowed straight into edits (backend DTO, frontend page, interface)
and the Plane issue only got created after the fix was already committed. The mistake wasn't
misunderstanding the instruction — it was reading it, then not gating actions on it once mid-task
momentum took over.

**How to apply:** When a message contains an explicit sequencing instruction (create X first / explain
before doing / confirm before implementing), treat it as a hard checkpoint, not a preference. Diagnosis
and investigation (reading code, reproducing the bug, understanding root cause) is fine to do first —
that's needed to write a good ticket/explanation anyway. But stop before Edit/Write calls until the
requested checkpoint (ticket created, plan stated, explicit go-ahead) has actually happened. Applies
generally, not just to Plane tickets — any "tell me first" / "ask before" instruction in a session.
