# Invoice processing: ui/ — what the user sees

Shows pages and forms, reads input, and calls **one service function** per action.

## In this feature

Receipt photo selection, scan queue and editable review screen. User edits are authoritative when confirmed.

| File | What it has |
|---|---|
| `actions.ts` | `uploadReceiptImageAction`, `scanReceiptAction` (need a user with an active business) |
| `use-scan-receipt.ts` | client hook: check photo → upload → scan |
| `scan-receipt-page.tsx, review-receipt-page.tsx` | the /scan and /scan/review pages (the review page uses `core/receipt-review-rules` for live totals) |
| `review/` | receipt review components |

## Rules

- `queries.ts` (server-only): reads for Server Components → call services.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- May import: this feature's `services/` and `types/`; other features' `server.ts`; `@/components`, `@/lib`.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
