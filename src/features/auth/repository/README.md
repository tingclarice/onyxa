# Authentication: repository/

Data adapters: perform database/provider operations and map results to feature contracts.

## Feature responsibilities

Server-only Prisma account persistence and Node scrypt adapters. Map unique email conflicts to the account contract and update login state using optimistic version checks.

## Boundaries

- Implement interfaces from `types/`. Use shared technical clients where appropriate, with request-dependent setup supplied by server-only delivery wiring. Keep code that accesses server data server-only.
- No business calculations, forecasting thresholds, navigation, or UI logic. Require and apply trusted owner/tenant scope for relevant operations; never trust ownership supplied by the browser.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

