# Invoice processing: types/ — shared shapes

Types, zod schemas, result shapes and error classes used by every layer.

## In this feature

Scan and save shapes.

| File | What it has |
|---|---|
| `scan.ts` | Scan draft schema/results, image source and extraction ports, upload result, stricter confirmed-save schema, `ReceiptLineToSave`, `CatalogItem`, safe error codes, size/type limits |
| `ports.ts` | Image uploader/URL validator and receipt-save transaction/repository contracts |

## Rules

- Keep contracts independent of frameworks, databases and provider SDKs. Validation schemas may use `zod`.
- Drafts allow unknown values for review; `SaveReceiptInputSchema` requires a valid date and positive item quantities.
- Never put secrets (e.g. password hashes) in types sent to the browser.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
