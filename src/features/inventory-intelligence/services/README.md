# Inventory intelligence: services/ — the high-level steps

One exported function per user action. Each reads like a recipe: find → check → save.

## In this feature

Obtain normalized history by calling repository functions, invoke core forecasting, and coordinate permitted item/restock operations. Derive user scope at the server boundary and preserve it throughout the use case.

Not built yet. Add files here only when the feature is implemented.

## Rules

- Calls `repository/` functions directly (plain imports) and `core/` functions for every rule.
- Several writes that must succeed together go inside `runInTransaction(async (db) => ...)` from `@/lib/database-transaction`; pass `db` as the last argument to each repository call.
- Takes `now: Date = new Date()` as an optional last parameter when time matters.
- May call another feature's `services/`.
- Never: inline math/rules, Prisma queries, `fetch`, React, Next.js cookies/redirects.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
