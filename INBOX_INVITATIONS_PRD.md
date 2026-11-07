# Simple invitation inbox

Date: 2026-11-07. Status: approved by Felix ("oke do it"); implemented and validated.

## 1. Problem

Invitation codes, link sharing, the waiting button, and duplicate navigation make
joining a business unnecessarily complicated. Business-free accounts also see
navigation for a workspace they do not yet have.

## 2. Success criteria

- An owner invites a recipient by email. Matching invitations automatically appear
  in the signed-in recipient's inbox, including after registration.
- The recipient opens the inbox and answers **Yes** or **No**. No invitation code,
  secret link, copy button, or code-entry step remains.
- The invitation card on the post-signup onboarding page has one **View Inbox**
  link. Remove **Saya menunggu undangan**, its state, and embedded invitation forms.
- An **Inbox icon**, with a pending count when needed, opens the inbox page from
  the header. Remove the right-side menu/drawer and its duplicated navigation.
- Accounts without a business see no left sidebar or bottom business navigation.
  The inbox remains accessible before business creation or invitation acceptance.
- Accounts with a business retain their normal navigation, account sign-out and
  business switching, without a second navigation panel on the right.
- Yes creates staff membership atomically; No dismisses the invitation. A user
  cannot read or respond to another account's invitations by changing an ID.

## 3. Scope

Use the existing `business-management` feature and its five layers. Add an inbox
page through Next.js routing/composition, server queries and Server Functions.
Keep owner-only invitation creation/revocation, seven-day expiry, duplicate checks,
tenant scopes, transaction rollback and safe repeated/concurrent responses.

Remove the code-specific schemas, crypto adapter, proof cookie, code UI/actions,
and secret issuance results. Retire the old `/undangan` code page with a redirect
to the inbox. Remove the unused `tokenHash` column in a new migration, updating
Prisma, Mermaid, tests and current setup documentation together. Preserve existing
invitation rows and their recipient email, accepted/revoked state and expiry.

Keep signup account-only. Keep business creation as the separate existing option.
This change does not add SMTP, email confirmation, a notification table, realtime
infrastructure, password recovery or a new feature package.

## 4. Constraints

- Stay on the current `main` branch; do not create or switch branches.
- Preserve package-by-feature and hexagonal dependencies. Authenticate protected
  Server Functions, derive recipient identity from the trusted session, and apply
  recipient/tenant scope in repository reads and writes.
- Invitation visibility and responses now follow the account's normalized email.
  Current local signup does not verify mailbox ownership: someone who registers
  an unused email address can receive invitations addressed to it. Removing secret
  proof adopts that limitation; this change will not claim email verification.
- Reuse the current UI primitives, palette and typography. Keep the header compact
  and preserve keyboard access, accessible icon labels and pending/error feedback.
- No new dependencies, internal application APIs, database resets, history edits
  or deletion of invitation/business/account records.

## 5. Plan

1. Obtain approval of this PRD under Felix's engineering workflow.
2. Replace secret-based invitation ports, queries and response validation with
   recipient-email-scoped inbox reads and invitation-ID responses.
3. Add the inbox page and Yes/No cards. Ensure the account-only layout can render
   the inbox instead of replacing every route with onboarding.
4. Simplify onboarding to creation and View Inbox. Replace the right drawer with
   the Inbox icon and hide business navigation until a membership exists. Keep
   business switching with existing business settings/account controls.
5. Remove code-only files/cookies and add the scoped Prisma migration and diagram
   updates. Inspect existing rows before applying; preserve their other fields.
6. Verify recipient isolation, expiry/revocation, duplicate/racing responses and
   rollback with relevant tests. Run pnpm lint, TypeScript, Prisma checks and a
   production build. Inspect onboarding/inbox/navigation at mobile and desktop
   widths, then commit the completed change on the existing branch.

Rollback: restore the previous application and schema through a follow-up
migration; do not reset the database. Removed token hashes cannot be recovered
from the new inbox flow; restoring code-based invitations would require new codes.

## 6. Open questions and recorded decisions

- Felix explicitly requested automatic inbox invitations, Yes/No responses,
  View Inbox on onboarding, removal of codes and the waiting button, hidden
  navigation before joining a business, and no redundant right-side menu.
- Interpret “just show inbox logo” as an accessible header link to the inbox,
  rather than another drawer containing business navigation.
- Keep invitations by email, including invitations issued before signup. No new
  recipient action is required beyond signing in and choosing Yes or No.
- Felix confirmed new users must retain optional business creation and approved
  implementation with "oke do it".

## Implementation and verification — 2026-11-07

### Approved UI correction — hide account email

1. **Problem:** the signed-in account email adds unnecessary information to
   onboarding and the inbox header.
2. **Success:** neither screen displays the account email.
3. **Scope:** remove the labels and unused email presentation props; update their
   existing test callers.
4. **Constraints:** preserve the approved architecture and current branch.
5. **Plan:** apply Felix's explicit removal request, then run the affected tests,
   TypeScript and lint. Roll back through a normal revert if needed.
6. **Decision:** Felix directly requested this correction: "remove it".

- Added `/inbox`, automatic recipient-email-scoped reads and invitation-ID Yes/No
  responses. Kept authorization, expiry/revocation, serializable transactions,
  duplicate prevention and staff-only invitation acceptance.
- Removed the secret adapter, code schemas/actions/forms, proof-cookie consumers,
  copy UI and right-side menu. `/undangan` redirects to the inbox. Onboarding has
  optional business creation and View Inbox; business-free accounts have no
  business navigation. Business switching and additional creation are in settings.
- Applied the token-column removal after inspecting the database: one existing
  account, no businesses/memberships/invitations. Counts and retained invitation
  fields matched afterward. Added the recipient-email index for inbox lookups.
  Existing migration files were not edited and no user records were removed.
- Production UI verification exposed a pre-existing Webpack CSS issue: the
  Tailwind entry was not compiled. Reused the installed loader for that same entry
  in Webpack, without new dependencies or changes to the existing Turbopack rule.
  Verified compiled utilities, the correct font and rendered production styles.
- Live verification used isolated `127.0.0.1:3001` sessions and synthetic records:
  signup, business creation, two invitations issued before recipient signup,
  automatic inbox delivery, No without membership, Yes granting staff membership,
  settings-based business switching, empty inbox and sign-out all passed.
  The 390/768/1440px checks found no horizontal overflow or browser errors.
  Removed only the guarded synthetic records; the existing account is preserved.
  Stopped the temporary preview and reset its viewport.
- Checks passed: `pnpm test:business` (35), `pnpm test:auth` (15), `pnpm test:db`
  (2), lint, TypeScript, Prisma generation/validation, `pnpm build --webpack`, and
  whitespace checks. Live Prisma schema diff reported no drift. UI source style
  lint reported zero failures/warnings. No branch was created or changed.
- The previously reproduced Windows Turbopack worker limitation remains; the
  Webpack path now also produces and serves the intended styles. No deployment
  was performed. Email ownership remains unverified as recorded in the approval.
