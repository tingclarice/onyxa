# Inventory intelligence: services/ — the high-level steps

One exported function per user action. Each reads like a recipe: find → check → save.

## In this feature

Movement use cases for a business.

| File | What it has |
|---|---|
| `movement-service.ts` | `getItemMovements` (slowing first), `getSlowingItems`, `getItemMovementDetail`; "today" is counted in WIB |

## Rules

- Calls `repository/` functions directly (plain imports) and `core/` functions for every rule.
- Several writes that must succeed together go inside `runInTransaction(async (db) => ...)` from `@/lib/database-transaction`; pass `db` as the last argument to each repository call.
- Takes `now: Date = new Date()` as an optional last parameter when time matters.
- May call another feature's `services/`.
- Never: inline math/rules, Prisma queries, `fetch`, React, Next.js cookies/redirects.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
