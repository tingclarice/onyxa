# Inventory intelligence: types/

Contracts and ports: describe inputs, outputs, data shapes, and repository interfaces.

## Feature responsibilities

Normalized restock facts, item/base-unit contracts, forecast results, movement statuses, and inventory-history repository ports. Do not depend on OCR confidence, images, provider JSON, or Prisma types.

## Boundaries

- Keep contracts independent of the other feature layers, Next.js, React, Prisma, and provider SDKs. Framework-independent input-validation schemas may live here.
- No database access, HTTP calls, side effects, or business workflows. Never use TypeScript `any`; narrow or validate `unknown` inputs.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

