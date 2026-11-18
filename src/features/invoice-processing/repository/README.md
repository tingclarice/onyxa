# Invoice processing: repository/ — getting and storing data

Talks to the outside world: the database (Prisma) and external services. Called by services.

## In this feature

Photo storage, receipt reading and receipt saving.

| File | What it has |
|---|---|
| `cloudinary-image.ts` | Validates and retrieves bounded receipt image data from Cloudinary |
| `receipt-image-storage.ts` | Connects receipt scanning to the shared Cloudinary uploader |
| `gemini.ts` | Gemini extraction provider; returns untrusted structured output |
| `receipt-transaction-repository.ts` | Transaction rows scoped to the active business |
| `receipt-repository.ts` | `findOrCreateSupplier`, `findItemByNameKey` (name or alias), `createItem`, `saveItemAliasIfFree`, `createSavedReceipt` |
| `receipt-save-adapter.ts` | Implements the receipt-save transaction port using `runInTransaction` and the persistence functions |

## Rules

- Plain exported functions, one per query, named after what they do (`findMembership`, `markInvitationAccepted`).
- Database functions take `db: DatabaseClient = getPrisma()` as the last parameter so they can run inside a transaction.
- Always filter by the trusted scope (business ID, user ID, recipient email).
- Map Prisma/provider records into `types/` shapes; never return raw records.
- No business decisions (permissions, pricing, forecasting) — those are `core/`.
- Mock data and fake providers live here, with the same signature the real version will have.
- Services depend on ports in `types/`; only the delivery boundary wires concrete adapters into them.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
