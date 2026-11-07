# Invoice processing: services/

Application use cases: coordinate repository ports and core rules.

## Feature responsibilities

Coordinate extracting a draft, applying core validation, and accepting confirmed corrections through the declared ports. Keep the workflow separate from OCR/provider implementations and inventory/pricing calculations.

## Boundaries

- Depend on `types/` and `core/`. Receive repository implementations through typed interfaces; server-only delivery code wires concrete adapters. Keep source dependencies independent of repository implementations.
- No embedded math/business algorithms, raw database/ORM queries, direct external fetches, React, Next.js cookies, redirects, or cache invalidation.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

## Existing code

`actions.ts` and `mock-receipts.ts` currently retain their legacy placement. Their target folders are `ui/` and `repository/` respectively; this task adds documentation only.

