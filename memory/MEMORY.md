# MEMORY.md

Index of durable cross-project lessons. One line per entry. Content lives in the linked file.

Entry types:
- **feedback** — a rule from user correction or a validated approach ("don't do X because Y")
- **reference** — durable pointer to where truth lives (Plane project ID, server hostname, etc.)
- **kinetic** / **domain** — knowledge about a specific piece of the stack

## Rules for writing memory

- One topic per file. Kebab-case filename with type prefix: `feedback_*.md`, `reference_*.md`.
- Frontmatter: `name`, `description` (used for relevance matching), `type`.
- Lead with the rule/fact, then a `**Why:**` line and `**How to apply:**` line.
- Link related memories with `[[other-name]]`.
- Update-in-place when a memory becomes wrong — don't leave stale entries.

Modeled after `KEpicorHelper/claude-memory/` — that repo has ~100 examples worth pattern-matching
against.

## Index

- [Commit format (Conventional Commits — universal)](feedback_commit_format.md) — every commit in every repo must be `<type>(<scope>): <desc>`; free-form summaries belong in handover docs / captures, not commit messages.
- [Audit controllers by class, not file](feedback_audit-controllers-by-class.md) — a file can hold multiple controller classes with different guards; grep by line number can't tell which.
- [Confirm before mutating shared accounts](feedback_confirm-before-mutating-shared-accounts.md) — don't assume every account matching a test scenario is a throwaway; ask before resetting/deleting.
- [Verify DB state before trusting zero-regression claims](feedback_verify-db-state-before-trusting-zero-regression-claims.md) — "this table is currently blank" is a claim to query, not infer from chat history.
