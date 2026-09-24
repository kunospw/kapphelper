---
date: 2026-09-04
source: meeting
from: Ken
type: constraint
about: Shared/demo passwords must never be pasted in full, openly, in shared material
plane: —
status: confirmed
---

## What

While reviewing Dyah's screen during the 4 Sept meeting, Ken noticed a widely-reused Kairos demo
password had been written out in full and left visible/open (e.g. in a doc or screen shared with
the team). He flagged two problems: (1) it's dangerous to expose a password used across multiple
customers/products in one place, and (2) because that password is reused so often it now shows up
in known-breached-password databases, which can cause some services to outright reject it.

Ken's rule going forward: either use a password that's unique to that one specific
customer/app context (fine to show openly), or mask the shared one when it needs to appear at all
— e.g. show only a partial/obfuscated form rather than the literal string, so people who already
know it recognize it without it being fully exposed. He noted the exception: a password used only
for one-off testing (e.g. the KDocVerify test login) is fine to show in full since it isn't a
widely-reused credential.

## Why

Ken, live in the meeting, reacting to seeing the full shared password on screen — attributed
directly to the risk of credential reuse across the team's demo/test accounts and to breached-
password-list rejections.

## Impact

- Applies wherever team members currently write this shared password in the clear — docs,
  screenshots, chat, session notes. Should be masked or replaced with a customer-specific one.
- Reinforces the existing kapphelper hard rule ("Secrets never in git... reference *where* they
  live, not the values") — this is the same principle extended to any shared doc/screen, not just
  git.

## Scrubbed

The actual password Ken was reacting to is not reproduced here or anywhere in kapphelper. It is a
shared Kairos demo/test credential — check with Ken or Dyah for where the current value (or its
replacement) is stored.
