# Inventory intelligence: types/ — shared shapes

Types, zod schemas, result shapes and error classes used by every layer.

## In this feature

Normalized restock facts, item/base-unit contracts, forecast results, movement statuses, and inventory-history shapes. Do not depend on OCR confidence, images, provider JSON, or Prisma types.

Not built yet. Add files here only when the feature is implemented.

## Rules

- No logic and no imports except `zod`.
- Never put secrets (e.g. password hashes) in types sent to the browser.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
