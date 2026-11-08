# Invoice processing: core/ — small rules and calculations

Pure helper functions called by services: data in → data out, or throw a typed error.

## In this feature

Receipt rules, used by services and (for instant feedback) by the browser.

| File | What it has |
|---|---|
| `receipt-image-rules.ts` | `getReceiptImageProblem` — type and 8 MB size check |
| `receipt-review-rules.ts` | `LOW_CONFIDENCE_THRESHOLD` (0.8), `isLowConfidence`, `sumLineTotals`, `hasTotalMismatch`, `countFieldsNeedingReview` |
| `receipt-line-rules.ts` | `convertToBaseUnit` (g→kg, ml→liter, other units→pcs), `quantityInItemUnit`, `chooseItemName`, `shouldSaveAlias`, `normalizeNameKey` |
| `receipt-rules.test.ts` | Receipt validation rule coverage |

## Rules

- Names: `checkX` throws when the rule fails · `isX`/`hasX`/`canX` return a boolean · `calculateX`/`buildX`/`chooseX` return data.
- Put numbers like `7` days or `0.8` confidence in named constants.
- Time and other changing values are parameters.
- May import: this feature's `types/` and other `core/` files.
- Never: database, `fetch`, `process.env`, React, Next.js.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
