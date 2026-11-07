# Business management: ui/ — what the user sees

Shows pages and forms, reads input, and calls **one service function** per action.

## In this feature

Onboarding, business forms, inbox, team settings.

| File | What it has |
|---|---|
| `actions.ts` | Server Functions for every business form; `respondInvitationAction` calls `acceptInvitation` or `declineInvitation` |
| `queries.ts` | `getBusinessWorkspace`, `requireActiveBusiness`, `getSettings` (exported to other features via `../server.ts`) |
| `active-business-cookie.ts` | save/read the chosen business (`<userId>:<businessId>`) |
| `error-messages.ts` | `toErrorResult` — any error → safe message |
| `form-fields.ts` | `readFormFields` — FormData → object for zod |
| `*.tsx` | pages and components |

## Rules

- `queries.ts` (server-only): reads for Server Components → call services.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- May import: this feature's `services/` and `types/`; other features' `server.ts`; `@/components`, `@/lib`.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
