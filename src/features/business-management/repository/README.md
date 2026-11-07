# Business management: repository/ — getting and storing data

Talks to the outside world: the database (Prisma) and external services. Called by services.

## In this feature

Prisma queries for businesses, members and invitations. Inbox reads are scoped by the session's recipient email (approved in `INBOX_INVITATIONS_PRD.md`).

| File | What it has |
|---|---|
| `business-repository.ts` | `createBusinessWithOwner`, `saveBusinessProfile`, `saveAlertPreferences` |
| `membership-repository.ts` | `findMembership`, `listActiveMembershipsOfUser`, `saveMembership`, … |
| `invitation-repository.ts` | `findInvitationForRecipient`, `createInvitation`, `markInvitationAccepted`, `markInvitationRevoked`, … |
| `record-mappers.ts` | which columns to read and Prisma row → our type mapping |

## Rules

- Plain exported functions, one per query, named after what they do (`findMembership`, `markInvitationAccepted`).
- Database functions take `db: DatabaseClient = getPrisma()` as the last parameter so they can run inside a transaction.
- Always filter by the trusted scope (business ID, user ID, recipient email).
- Map Prisma/provider records into `types/` shapes; never return raw records.
- No business decisions (permissions, pricing, forecasting) — those are `core/`.
- Mock data and fake providers live here, with the same signature the real version will have.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
