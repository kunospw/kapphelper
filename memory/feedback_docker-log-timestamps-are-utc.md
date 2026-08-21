---
name: docker-log-timestamps-are-utc
description: docker compose logs --since/--until with an absolute timestamp needs UTC, not the user's local wall-clock time from a screenshot — use a relative window (e.g. --since 3h) instead when correlating against a screenshot's clock.
metadata:
  type: feedback
---

`docker compose logs --since "<ISO timestamp>" --until "<ISO timestamp>"` interprets a bare
timestamp (no offset) as UTC. Serilog console output inside these containers is also UTC. A
screenshot's taskbar clock, however, is the user's local timezone — which may not even match the
server's assumed timezone (observed offset was ~7h on KairosTSApp, not a clean UTC+8, so don't
even trust "just add 8 hours").

**Why:** On KairosTSApp (2026-08-21), asked to verify a concurrent-generate test via logs, gave a
`--since "2026-08-21T08:03:00" --until "2026-08-21T08:10:00"` window built directly from a
screenshot's local clock (8:05 AM). The query returned zero matches — not because nothing
happened, but because the real UTC time of the test was ~01:05, a full window away. Wasted a
round trip diagnosing "did the container restart / did logs get lost" before realizing the window
itself was wrong.

**How to apply:** When correlating a docker log query against a screenshot or a user's stated
clock time, don't compute an absolute UTC window by hand. Use a relative `--since <duration>`
(e.g. `--since 3h`, `--since 30m`) generous enough to comfortably cover the event, then grep/filter
within that output. Only reach for absolute `--since`/`--until` timestamps once you've confirmed
the container's actual clock/timezone (e.g. via `docker inspect --format '{{.State.StartedAt}}'`,
which is UTC) rather than assuming it matches the user's local time.
