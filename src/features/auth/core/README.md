# Authentication: core/

The pure business library: data in, processing, data out.

## Feature responsibilities

Pure failed-login/lockout policies. Time is an input. Password hashing is performed by the crypto adapter, not core.

## Boundaries

- Depend only on feature contracts and other pure helpers. Receive dates and other varying values as inputs. Use `core/` consistently instead of introducing a parallel `domain/` folder.
- No React, Next.js, Prisma, database drivers, repositories, HTTP clients, provider SDKs, request cookies, or implicit I/O.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

