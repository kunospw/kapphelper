---
name: model-usage-discipline
description: Default to Sonnet 5 at medium effort to conserve Claude usage/credits across the team; escalate model/effort deliberately, not by default
metadata:
  type: feedback
---

Kairos custom-apps team shares a limited pool of Claude usage across multiple people (Dyah,
Jesynta, Praisilia, plus accounts routed through "Nasme" and other team members). Jesynta hit her
weekly Claude limit on/before 1 Sept (locked out until reset 3 Sept) from using a more expensive
model/effort combination. Ken's standing guidance since then: **default to Sonnet 5 with medium
effort** for day-to-day dev work — it's enough for most tasks and burns usage much slower than
Opus/Fable or high effort. Drop to low effort or Haiku if usage needs to stretch further; only
step up to a stronger model/effort deliberately for a task that actually needs it.

**Why:** Ken, 1 Sept and reiterated 9 Sept — once a weekly/expenditure limit is hit, that person
can't code at all until reset, which blocks real work. He'd rather the team consistently use a
cheaper default than occasionally hit a wall. He also tracks spend directly (e.g., checked a
specific account's remaining balance in the 9 Sept meeting) and expects people to keep an eye on
their own usage via the `/status` or `/usage` equivalent rather than being surprised by it.

**How to apply:** Before starting a long/agentic session (especially unattended build-server work
per [[use-mac-build-server-for-app-store-uploads]]), check current effort/model and usage
percentage. If a personal allocation is exhausted, coordinate sharing another team member's
account (Ken has assigned specific spare accounts to specific people) rather than escalating model
tier to push through.
