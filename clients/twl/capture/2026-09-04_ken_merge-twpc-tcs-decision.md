---
date: 2026-09-04
source: meeting
from: Ken
type: decision
about: Merge TWPC + TCS time-entry apps into one app with central admin
plane: —
status: confirmed
---

## What

TWPC (Tiong Woon Projects and Contracting) Time Entry and TCS (Tower Crane Services) Time Entry —
both Tiong Woon Logistics group departments — currently exist as two entirely separate mobile
apps/codebases, built that way originally because past developers didn't design around user-role-
based views. Ken considers this a maintenance headache (every change has to be made twice, and
neither app is well designed) and wants them merged into **one new application**, with:

- A **central application administration page**: users log on with their email; the system shows
  them which application(s)/roles they're assigned to, and links them to the relevant Epicor
  instance — configured centrally by an admin rather than typed manually on the mobile app each
  time.
- Either a single shared feature set for both departments, or a per-department workflow within the
  same app — Ken wants to think this through properly rather than commit immediately.

**Sequencing, reiterated on 11 Sept**: don't start building the merge yet. Praisilia was assigned
to first fully understand the current TWPC/TCS apps as they exist today (including logging, so
faults can be diagnosed quickly) and be able to support the live customers on both, before any
merge planning starts. No new features should be added to the current separate apps in the
meantime — fix/support only. The combined app is, for now, only a documented plan/architecture
note ("super app architecture") with a design but nothing built.

Separately, KFMS (fleet management / driver journeys — start→arrived→complete, container counts,
FMS planner) is a distinct, more ambitious product being aimed at the same Tiong Woon relationship
as a full end-to-end demo, currently at MVP/proof-of-concept level only ("not fully working yet" —
Ken, 1 Sept) and assigned to Praisilia for understanding + API documentation, not customer-facing
yet.

## Why

Ken, 4 Sept: the two-app split was a past developer mistake ("they were not very good at it")
rather than a deliberate design choice, and it's now costing double the maintenance effort. On 11
Sept he reiterated the sequencing explicitly because he doesn't want a rebuild attempted before the
person doing it (Praisilia) understands what already exists and can support the live customer.

## Impact

- No immediate code change — this is a forward-looking architecture decision.
- Praisilia's near-term mandate: learn TWPC/TCS as-is (incl. logging), be able to troubleshoot
  live issues, before any merge design work starts.
- When merge planning does start, it needs 2-3 people involved per Ken's estimate (1 Sept), not
  one person alone, given the scope (orders → quotes → journeys → FMS planner integration for the
  fuller KFMS vision, even though the immediate merge is scoped to just TWPC+TCS time entry).
