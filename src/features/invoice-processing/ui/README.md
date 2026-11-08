# Invoice processing: ui/ — building blocks for pages

Components, queries and Server Functions. Whole pages live in `src/app/`; they import these.

## In this feature

Building blocks for app/(authenticated)/scan and scan/review. User edits are authoritative when confirmed.

| File | What it has |
|---|---|
| `actions.ts` | `uploadReceiptImageAction`, `scanReceiptAction`, `saveReceiptAction` (all need a user with an active business; scan adapters are wired here) |
| `use-scan-receipt.ts` | client hook: check photo → upload → scan |
| `receipt-scanner.tsx` | `<ReceiptScanner />`: photo picker and scan queue (title lives in the page) |
| `receipt-review-form.tsx` | `<ReceiptReviewForm />`: edit a scanned receipt with live checks from `core/receipt-review-rules`; Simpan calls `saveReceiptAction` |
| `review/` | receipt review fields and rows |

## Rules

- Components get their data as props.
- `queries.ts` (server-only): reads → call services. Pages reach them through `../server.ts`.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- Server actions may also import this feature's `repository/` only to wire concrete adapters into services; client components never import repositories.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: whole pages, `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
