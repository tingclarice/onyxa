# Inventory intelligence: ui/ — building blocks for pages

Components, queries and Server Functions. Whole pages live in `src/app/`; they import these.

## In this feature

Inventory lists/details, restock-entry or correction forms, and forecast/status presentation. Display forecasts as inferred estimates and show insufficient-history states returned by services.

Not built yet. Add files here only when the feature is implemented.

Not built yet. Add files here only when the feature is implemented.

## Rules

- Components get their data as props.
- `queries.ts` (server-only): reads → call services. Pages reach them through `../server.ts`.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- May import: this feature's `services/` and `types/`; other features' `server.ts`; `@/components`, `@/lib`.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: whole pages, `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
