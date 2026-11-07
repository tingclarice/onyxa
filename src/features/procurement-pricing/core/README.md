# Procurement pricing: core/ — small rules and calculations

Pure helper functions called by services: data in → data out, or throw a typed error.

## In this feature

Pure unit-price normalization, EMA baselines, variance calculations, and alert classification. Use comparable units and explicit inputs; do not fetch history or call provider SDKs here.

Not built yet. Add files here only when the feature is implemented.

## Rules

- Names: `checkX` throws when the rule fails · `isX`/`hasX`/`canX` return a boolean · `calculateX`/`buildX`/`chooseX` return data.
- Put numbers like `7` days or `0.8` confidence in named constants.
- Time and other changing values are parameters.
- May import: this feature's `types/` and other `core/` files.
- Never: database, `fetch`, `process.env`, React, Next.js.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
