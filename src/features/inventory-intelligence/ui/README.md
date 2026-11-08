# Inventory intelligence: ui/ — building blocks for pages

Components, queries and Server Functions. Whole pages live in `src/app/`; they import these.

## In this feature

Building blocks for /barang, /barang/[id] and the home-screen warning card.

| File | What it has |
|---|---|
| `queries.ts` | `getActiveBusinessItemMovements`, `getActiveBusinessItemDetail`, `getActiveBusinessSlowMovingWarnings` (pages import them via `../server.ts`; grace % and the alert switch come from the active business) |
| `item-movement-list.tsx` | `<ItemMovementList />`: searchable item cards with badge and one-line explanation |
| `slow-moving-warning-card.tsx` | `<SlowMovingWarningCard />`: slowing items with drop % and delay, or "Semua aman" |
| `movement-explanation.tsx, purchase-history-list.tsx` | item page pieces |
| `movement-badge.tsx` | Melambat / Normal / Belum cukup data |
| `movement-format.ts` | display text only (units, days, per-day amounts) |

## Rules

- Components get their data as props.
- `queries.ts` (server-only): reads → call services. Pages reach them through `../server.ts`.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- May import: this feature's `services/` and `types/`; other features' `server.ts`; `@/components`, `@/lib`.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: whole pages, `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
