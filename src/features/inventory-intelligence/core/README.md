# Inventory intelligence: core/ — small rules and calculations

Pure helper functions called by services: data in → data out, or throw a typed error.

## In this feature

Burn-rate rules. All numbers are named constants at the top of the file.

| File | What it has |
|---|---|
| `burn-rate-rules.ts` | `calculateBurnRates` (qty ÷ days to next purchase), `calculateEma` (`EMA_SMOOTHING` 0.4), `calculateItemMovement` (needs `MIN_PURCHASES` 3; Melambat when late by more than grace % of the expected days, min. `MIN_GRACE_DAYS` 1), `calculateDropPercent`, `compareByUrgency` |

## Rules

- Names: `checkX` throws when the rule fails · `isX`/`hasX`/`canX` return a boolean · `calculateX`/`buildX`/`chooseX` return data.
- Put numbers like `7` days or `0.8` confidence in named constants.
- Time and other changing values are parameters.
- May import: this feature's `types/` and other `core/` files.
- Never: database, `fetch`, `process.env`, React, Next.js.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
