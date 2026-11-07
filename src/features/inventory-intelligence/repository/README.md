# Inventory intelligence: repository/ — getting and storing data

Talks to the outside world: the database (Prisma) and external services. Called by services.

## In this feature

Owner-scoped item/restock queries and persistence adapters. Map database dates and quantities into the agreed contracts. Do not calculate EMA, choose movement statuses, or decide alert thresholds here.

Not built yet. Add files here only when the feature is implemented.

## Rules

- Plain exported functions, one per query, named after what they do (`findMembership`, `markInvitationAccepted`).
- Database functions take `db: DatabaseClient = getPrisma()` as the last parameter so they can run inside a transaction.
- Always filter by the trusted scope (business ID, user ID, recipient email).
- Map Prisma/provider records into `types/` shapes; never return raw records.
- No business decisions (permissions, pricing, forecasting) — those are `core/`.
- Mock data and fake providers live here, with the same signature the real version will have.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
