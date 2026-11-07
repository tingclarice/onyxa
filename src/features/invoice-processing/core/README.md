# Invoice processing: core/

The pure business library: data in, processing, data out.

## Feature responsibilities

Pure invoice validation, line-total reconciliation, category constraints, and rules for accepting corrected data. Treat extraction output as a draft; do not invoke OCR, Gemini, or Prisma here.

## Boundaries

- Depend only on feature contracts and other pure helpers. Receive dates and other varying values as inputs. Use `core/` consistently instead of introducing a parallel `domain/` folder.
- No React, Next.js, Prisma, database drivers, repositories, HTTP clients, provider SDKs, request cookies, or implicit I/O.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

## Existing code

No core implementation is created by this scaffolding task.

