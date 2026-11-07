# Authentication: services/

Application use cases: coordinate repository ports and core rules.

## Feature responsibilities

Register accounts and authorize credentials through injected account and password ports. Signup creates no business or membership. Keep failed-login policy in core.

## Boundaries

- Depend on `types/` and `core/`. Receive repository implementations through typed interfaces; server-only delivery code wires concrete adapters. Keep source dependencies independent of repository implementations.
- No embedded math/business algorithms, raw database/ORM queries, direct external fetches, React, Next.js cookies, redirects, or cache invalidation.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

