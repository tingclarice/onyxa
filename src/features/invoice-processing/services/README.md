# Invoice processing: services/ — the high-level steps

One exported function per user action. Each reads like a recipe: find → check → save.

## In this feature

Receipt scanning and saving use cases.

| File | What it has |
|---|---|
| `receipt-scan-service.ts` | `uploadReceiptPhoto`, `scanReceipt`; accepts image-storage, image-source and extraction-provider ports |
| `receipt-save-service.ts` | `saveReviewedReceipt`: supplier → items (find by name/alias or create) → receipt + lines, through a transaction port |
| `extract-receipt.ts` | Loads image bytes and validates untrusted provider output against the scan contract |

## Rules

- Scan extraction depends on the typed image-source and extraction-provider ports in `types/`; `ui/actions.ts` wires their repository implementations.
- Upload and save services depend only on typed ports in `types/`.
- `ui/actions.ts` wires concrete repository adapters. The save adapter owns the database transaction and delegates to persistence functions.
- Several writes that must succeed together are run through the repository transaction port.
- Takes `now: Date = new Date()` as an optional last parameter when time matters.
- May call another feature's `services/`.
- Never: inline math/rules, repository imports, Prisma queries, `fetch`, React, Next.js cookies/redirects.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
