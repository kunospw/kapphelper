---
date: 2026-08-24
source: session
from: Dyah
type: issue
about: KairosTSApp email test-mode config, per company
plane: KAIROSTSAP-103 (related — same session, Epicor incident)
status: confirmed
---

## What

Audited `CompEmailConfigs` on Pilot for all 6 Tai Sin companies, prompted by Dyah noticing other
companies didn't have test mode on. Findings:

- **LKHE** — fully configured: `IsTestMode=1`, `TestEmailOverride` set to internal team
  (Ken/Dyah), `IncludeClientInTest=1` with a client tester list. Working as intended.
- **LKHPD** — had a `CompEmailConfigs` row with `IsTestMode=1` but `TestEmailOverride` **blank**.
  `SmtpHost`/`FromEmail`/`PasswordEncrypted` were also all blank, so no actual send risk existed
  yet — but the checkbox showing "on" while the redirect logic (`EmailService.cs:386`,
  `IsTestMode && !string.IsNullOrWhiteSpace(TestEmailOverride)`) is actually inert is a landmine:
  whoever fills in SMTP credentials later would reasonably assume the safety net is already armed.
  **Fixed same session** — `TestEmailOverride`, `IncludeClientInTest`, and `ClientTestEmails` set
  to match LKHE exactly.
- **EG, LKHP, TSE, TSPD** — no `CompEmailConfigs` row at all. `EmailService.SendTemplatedEmailAsync`
  throws `"No active email config for company {CompId}"` when the row is missing, so sending fails
  outright for these four rather than silently reaching a real customer — safe by absence, not by
  design.

## Why

Pilot is still in testing; an email reaching a real Tai Sin customer by accident (rather than the
internal test inbox) would be a real incident, not a cosmetic bug. The LKHPD case specifically
matters because "the checkbox is checked" is not the same as "the safety net works" — the code
requires both `IsTestMode` and a non-blank `TestEmailOverride`.

## Impact

- LKHPD is now safe for whenever its SMTP gets configured — the test-mode redirect is armed and
  will not need adjusting.
- **Standing rule for EG/LKHP/TSE/TSPD**: when a session sets up SMTP for any of these companies
  (Admin → Companies → Email Configuration), `IsTestMode` + `TestEmailOverride` (+
  `IncludeClientInTest`/`ClientTestEmails` if applicable) must be filled in **the same save**, not
  as a follow-up step — a gap between "SMTP works" and "test mode is actually armed" is exactly
  the LKHPD landmine, just with a live SMTP connection behind it next time. Worth checking this
  memory/capture before that work happens.
