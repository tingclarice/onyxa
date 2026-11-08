# Procurement pricing: types/ — shared shapes

Types, zod schemas, result shapes and error classes used by every layer.

## In this feature

Normalized price observations, item/supplier identifiers, price-analysis results, and price-history shapes. Keep OCR/provider formats and ORM objects out of these contracts.

Not built yet. Add files here only when the feature is implemented.

## Rules

- No logic and no imports except `zod`.
- Never put secrets (e.g. password hashes) in types sent to the browser.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
