# Invoice processing: services/ — the high-level steps

One exported function per user action. Each reads like a recipe: find → check → save.

## In this feature

Receipt scanning and saving use cases.

| File | What it has |
|---|---|
| `receipt-scan-service.ts` | `uploadReceiptPhoto`, `scanReceipt` |
| `receipt-save-service.ts` | `saveReviewedReceipt`: supplier → items (find by name/alias or create) → receipt + lines, in one transaction |
| `extract-receipt.ts` | Loads image bytes and validates untrusted provider output against the scan contract |

## Rules

- Scan extraction depends on the typed image-source and extraction-provider ports in `types/`; `ui/actions.ts` wires their repository implementations.
- `receipt-save-service.ts` retains legacy direct repository imports; new service dependencies must follow the typed-port boundary.
- Several writes that must succeed together go inside `runInTransaction(async (db) => ...)` from `@/lib/database-transaction`; pass `db` as the last argument to each repository call.
- Takes `now: Date = new Date()` as an optional last parameter when time matters.
- May call another feature's `services/`.
- Never: inline math/rules, Prisma queries, `fetch`, React, Next.js cookies/redirects.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
