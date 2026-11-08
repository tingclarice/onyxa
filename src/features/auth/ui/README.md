# Authentication: ui/ — building blocks for pages

Components, queries and Server Functions. Whole pages live in `src/app/`; they import these.

## In this feature

Login/signup forms, Auth.js setup and the session.

| File | What it has |
|---|---|
| `actions.ts` | `loginAction`, `signupAction`, `signOutAction` |
| `authjs.ts` | Auth.js Credentials/JWT setup; its `authorize` calls `loginWithPassword`. The only approved Route Handler (`app/api/auth/[...nextauth]`) uses its `handlers`. |
| `session.ts` | `getCurrentUser`, `requireUser` (exported to other features via `../server.ts`) |
| `auth-error-messages.ts` | `toAuthErrorResult` — any error → safe form message |
| `auth-form.tsx, sign-out-button.tsx` | client components |

## Rules

- Components get their data as props.
- `queries.ts` (server-only): reads → call services. Pages reach them through `../server.ts`.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- May import: this feature's `services/` and `types/`; other features' `server.ts`; `@/components`, `@/lib`.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: whole pages, `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
