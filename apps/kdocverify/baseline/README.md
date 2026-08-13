# baseline/ — KDocVerify

Frozen source-of-truth documents. Never edit files in this folder — if the source changes,
add a new dated copy alongside the old one.

## What to put here

- `KDocVerify_Enterprise_Readiness_Plan.md` (Dyah, 2026-06-12) — the phased plan doc
- Any client-facing scope PDFs if/when KDocVerify is sold externally
- Signed change requests

## What NOT to put here

- Working notes → use `../capture/` instead
- Code — that lives in `KConnectApp/`
- Anything that will change over time — the point of this folder is immutability

## To seed

Copy from `KConnectApp/docs/KDocVerify_Enterprise_Readiness_Plan.md` on first sync. Rename with
a version suffix once a v2 exists.
