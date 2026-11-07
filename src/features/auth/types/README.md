# Authentication: types/

Contracts and ports: describe inputs, outputs, data shapes, and repository interfaces.

## Feature responsibilities

Local account/session DTOs, validated credentials, result contracts, account persistence and password-hashing ports. Never expose a password hash through client-safe identity DTOs.

## Boundaries

- Keep contracts independent of the other feature layers, Next.js, React, Prisma, and provider SDKs. Framework-independent input-validation schemas may live here.
- No database access, HTTP calls, side effects, or business workflows. Never use TypeScript `any`; narrow or validate `unknown` inputs.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

