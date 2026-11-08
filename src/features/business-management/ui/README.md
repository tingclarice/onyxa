# Business management: ui/ — building blocks for pages

Components, queries and Server Functions. Whole pages live in `src/app/`; they import these.

## In this feature

Building blocks for the business pages in app/ (beranda, pengaturan, inbox, bisnis/baru) and the authenticated layout.

| File | What it has |
|---|---|
| `queries.ts` | `getBusinessWorkspace`, `requireActiveBusiness`, `getActiveBusinessSettings` (pages import them via `../server.ts`) |
| `actions.ts` | Server Functions for every business form; `respondInvitationAction` calls `acceptInvitation` or `declineInvitation` |
| `business-forms.tsx` | client forms: create business, profile, alerts, invite, switch business, invitation Yes/No, revoke |
| `active-business-header.tsx, team-summary-card.tsx` | home-screen pieces |
| `member-list.tsx, pending-invitation-list.tsx` | settings-page pieces |
| `invitation-inbox.tsx` | inbox list or empty message |
| `onboarding.tsx, inbox-link.tsx, business-unavailable.tsx` | used by the authenticated layout |
| `active-business-cookie.ts, error-messages.ts, form-fields.ts` | helpers for queries/actions |

## Rules

- Components get their data as props.
- `queries.ts` (server-only): reads → call services. Pages reach them through `../server.ts`.
- `actions.ts` (`"use server"`): mutations. Steps: get user → validate form → call one service in `try/catch` → safe error message → `revalidatePath` / cookie / `redirect`.
- May import: this feature's `services/` and `types/`; other features' `server.ts`; `@/components`, `@/lib`.
- Client components may import pure `core/` functions **only** for instant on-screen calculations (approved option B exception).
- Never: whole pages, `repository/`, Prisma, business rules.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
