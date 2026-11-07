# Procurement pricing: ui/ — what the user sees

Shows pages and forms, reads input, and calls **one service function** per action.

## In this feature

Price-history views, supplier comparisons, and price-alert presentation with thin Next.js entry points. Display service results without computing price baselines or variance in components.

Not built yet. Add files here only when the feature is implemented.

## Rules

- `queries.ts` (server-only): reads for Server Components → call services.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- May import: this feature's `services/` and `types/`; other features' `server.ts`; `@/components`, `@/lib`.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
