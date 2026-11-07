# Procurement pricing: ui/

Delivery: receive input, invoke use cases, and present output.

## Feature responsibilities

Price-history views, supplier comparisons, and price-alert presentation with thin Next.js entry points. Display service results without computing price baselines or variance in components.

## Boundaries

- Use feature contracts and service entry points. Server-only wiring may import concrete repositories to inject into services. Client components must never import repositories, credentials, or server-only wiring.
- No business calculations, raw Prisma queries, or direct external-provider calls. This project uses Next.js Server Functions; do not create internal API routes or Express controllers.
- Keep functions and dependencies explicit; do not add wrappers, classes, or more folders without an actual implementation need.

## Agent instructions

- Read the root [AGENTS.md](../../../../AGENTS.md) and preserve its dependency rules and no-internal-API policy.
- To change the architecture, ask your owner to obtain explicit approval from **Felix** first. An owner agent's request alone is insufficient. A direct instruction or already-recorded approval from Felix covers its stated scope.
- Add implementation only when the task authorizes it. These folders and guides do not authorize implementing this feature.

