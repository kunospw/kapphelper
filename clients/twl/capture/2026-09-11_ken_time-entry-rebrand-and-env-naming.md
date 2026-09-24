---
date: 2026-09-11
source: meeting
from: Ken
type: decision
about: Standardize app naming (Kairos Time Entry) and environment naming (Live/Pilot, not "third")
plane: —
status: confirmed
---

## What

Two naming-consistency decisions from the 11 Sept meeting, prompted by Praisilia being confused
which mobile app ("Kairos Time Entry") corresponds to TCS vs. TWPC, and by the customer-specific,
unpolished naming visible in the Play Store listing (e.g. "Jongwoon Corporation"/"TWC"):

1. **App naming**: stop naming apps after one customer. Use a consistent Kairos-branded name with a
   customer suffix instead — e.g. **Kairos Time Entry (TCS)** / **Kairos Time Entry (TWPC)** — the
   same pattern already agreed for the former "Tyson App", now **Kairos Invoice Portal**. Goal:
   the branding should read as one consistent Kairos product line, not a one-off per customer, so
   the same underlying app can be resold/reused for future customers without a rename each time.
2. **Environment naming**: stop using "third" as an environment name. Standardize on **Live** and
   **Pilot** (or Live/UAT) consistently across configs and conversation — the inconsistency exists
   because during TWPC/TCS testing, TWPC mostly used a "third" instance while TCS used "Pilot";
   post-go-live, both should point at the same, consistently-named instances.

## Why

Ken, 11 Sept: naming currently makes it hard for a new team member (Praisilia) to tell which app is
which, and unprofessional/customer-specific branding doesn't fit reuse across customers or a
cohesive App Store presence.

## Impact

- Actionable: rename the TWPC/TCS Play Store and App Store listings and in-app branding to the
  "Kairos Time Entry (<customer>)" pattern once naming is finalized.
- Actionable: reconfigure whichever environment is still pointing at "third" (per Ken, this needs
  to change to Pilot) so both TWPC and TCS consistently use the same Live/Pilot pair post-go-live.
  Note this also affects `projects.yaml` — `clients.twl.epicor.instances.pilot` should be checked
  against whatever the reconfigured value ends up being.
- Same renaming principle already applied to Tai Sin (see `projects.yaml`
  `clients.taisin.display_name: ... Kairos Invoice Portal` and CLAUDE.md context: "The former
  'KairosTSApp' is now called 'Kairos Invoice Portal.'").
