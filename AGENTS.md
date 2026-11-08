# Project architecture rules

## The one goal

**A human must be able to open any file and follow the flow by reading it top
to bottom and Ctrl+clicking function names.**

Clear, explicit, boring code wins over short or clever code. When choosing
between "fewer lines" and "easier to follow", choose easier to follow. Prefer:

- plain exported functions over factory objects, classes or dependency injection;
- one obvious place for each kind of code;
- function names that say what they do (`checkInvitationIsStillOpen`, not
  `recipientDecision`);
- small files grouped by topic (`invitation-service.ts`) over one big file;
- explicit `try/catch` and `if` steps over generic helper wrappers.

## The flow

Code is grouped **by feature** (package by feature), and inside each feature it
is split into **layers that call each other in one direction**:

```text
   app/…/page.tsx          THE PAGE: loads data through feature queries and
             │             arranges feature components. Open this file to see
             │             everything a URL shows.
             ▼
            ui/            building blocks: components (get data as props),
             │             queries.ts (reads), actions.ts (Server Functions).
             │             Each query/action calls ONE service function.
             ▼
         services/         high-level functions, one per user action
          │      │         ("createBusiness", "acceptInvitation", "scanReceipt").
          │      │         Each one reads like a recipe: find → check → save.
          ▼      ▼
       core/   repository/
  small helper   functions that get or store data: the database (Prisma) and
  rules and      outside services (Cloudinary, OCR, password hashing).
  calculations
  (no database)

  types/  shared shapes used by every layer: TypeScript types, zod schemas,
          error classes. No logic.
```

Example of one page, end to end:

```text
app/(authenticated)/pengaturan/page.tsx    PengaturanPage
  → getActiveBusinessSettings()              ← business-management/server.ts (ui/queries.ts)
      → services/business-service.ts         getBusinessSettings(...)
  → <MemberList members={members} />         ← business-management/ui/member-list.tsx
  → <InviteMemberForm businessId={...} />    ← business-management/ui/business-forms.tsx
```

Example of one form submit, end to end:

```text
ui/actions.ts             respondInvitationAction(form)
  → services/invitation-service.ts   acceptInvitation(user, invitationId)
      → repository/invitation-repository.ts   findInvitationForRecipient(...)
      → core/invitation-rules.ts               checkInvitationIsStillOpen(...)
      → repository/invitation-repository.ts   markInvitationAccepted(...)
      → repository/membership-repository.ts   saveMembership(...)
```

### Who may import whom

| Layer         | May import                                                      | Must NOT import                         |
|---------------|-----------------------------------------------------------------|-----------------------------------------|
| `app/` pages  | features' `server.ts` (data) and `ui/` components; shared `components/` and `lib/` | services, core, repository, Prisma |
| `ui/`         | its own `services/`, `types/`; other features' `server.ts`; shared `components/` and `lib/` | `repository/`, Prisma |
| `services/`   | its own `core/`, `repository/`, `types/`; other features' `services/`; `@/lib/database-transaction` | React, Next.js (cookies, redirect, revalidate) |
| `core/`       | its own `types/`, other `core/` files of the same feature        | repository, services, ui, Prisma, React, Next.js, `fetch`, `process.env` |
| `repository/` | its own `types/`, `@/lib/prisma`, `@/lib/database-transaction`, Prisma, provider SDKs | core, services, ui |
| `types/`      | `zod` only                                                       | everything else                         |

**One documented exception (approved by Felix, option B):** client UI may
import pure functions from its own feature's `core/` for **instant on-screen
calculations only**, for example recalculating a receipt total while the user
types. Anything that saves or loads data still goes through a service. The
same core function is then used by the service on the server, so the rule
exists in exactly one place.

## Folder layout

```text
src/
  app/                  Next.js routes. Each page.tsx is a real page: it loads
                        data and lays out feature components. No business
                        rules or database queries here.
  components/ui/        generic UI primitives (button, input, badge)
  components/           shared app shell and layout pieces (navigation,
                        providers, SettingsSection, StatusBadge)
  lib/                  feature-independent helpers (formatRupiah, prisma client,
                        runInTransaction). Must not import from features.
  features/<feature>/
    ui/                 components, queries.ts (reads), actions.ts (Server Functions).
                        No whole pages: pages live in app/.
    services/           <topic>-service.ts      → high-level use-case functions
    core/               <topic>-rules.ts        → checks and calculations
    repository/         <topic>-repository.ts   → database functions
                        <provider>-*.ts          → outside services (Cloudinary, OCR…)
    types/              <feature>.ts            → types, zod schemas, errors
    server.ts           public server entry for app/ pages and other features' UI
    testing/            (optional) test-only fakes, never imported by app code
```

Each folder has a `README.md`. Read it before working in that folder. Add
folders only when real code needs them.

The main business features are `invoice-processing`, `inventory-intelligence`
and `procurement-pricing`. `auth` owns accounts and login. `business-management`
owns business onboarding, membership, the active business and in-app
invitations (see `INBOX_INVITATIONS_PRD.md`): signup is account-only; business
creation and invitation answers (Yes/No from the email-scoped inbox) are
separate use cases. No invitation codes, proof cookies or right-side drawer.

## Rules per layer

### app/ pages

- `page.tsx` is the page. A reader opening it must see what the URL shows:
  the title, the data it loads and the components in order.
- Server pages are `async` Server Components: call queries from a feature's
  `server.ts`, then pass the data to feature components as props.
- Interactive screens (e.g. `/scan`) still own their title and layout in
  `page.tsx` and render one named client component from the feature
  (`<ReceiptScanner />`). When the whole screen is stateful, one named
  component is fine (`<ReceiptReviewForm />`).
- Never re-export a page from a feature (`export { X as default } from ...`).
- A page may combine components from several features; that is how the home
  screen grows (business, price alerts, stock, recent scans).
- Route settings (`export const instant`, metadata) live next to the page.
- No business rules, services, repositories or Prisma in `app/`. Show/hide
  decisions use values the query already computed (e.g. `canManage`).

### ui/

- React components, UI hooks, form parsing and showing results. Components
  receive their data as props; they do not fetch it themselves.
- `queries.ts` (server-only) for reads used by Server Components;
  `actions.ts` (file-level `"use server"`) for mutations.
- A Server Function is a thin, readable sequence:
  1. get the trusted user (`requireUser()` / `requireActiveBusiness()`);
  2. validate the form with a zod schema from `types/`;
  3. call **one** service function inside `try/catch`;
  4. on error, turn it into a safe message (`toErrorResult(error)`);
  5. do Next.js work: cookies, `revalidatePath`, `redirect` (outside the `try`).
- No business rules and no repository imports. Formatting and UI state are fine.

### services/

- One exported async function per user action, with a name a non-programmer
  understands. Write the steps in order so the function reads like a recipe.
- Calls `repository/` functions directly (plain imports, no injection) and
  `core/` functions for every rule or calculation.
- If several writes must succeed or fail together, wrap them in
  `runInTransaction(async (db) => { ... })` from `@/lib/database-transaction`
  and pass `db` as the last argument to each repository function.
- Takes `now: Date = new Date()` as an optional last parameter when time
  matters, so tests can pass a fixed date.
- No math or rule logic inline (put it in core), no Prisma queries, no `fetch`,
  no React, no Next.js cookies/redirects.

### core/

- Small pure functions: data in → data out (or throw a typed error).
- Naming: `checkX(...)` throws when the rule fails; `isX` / `hasX` / `canX`
  return a boolean; `calculateX` / `buildX` / `chooseX` return new data.
- Put magic numbers in named constants (`INVITATION_VALID_DAYS = 7`).
- Time and other changing values are parameters. No database, `fetch`,
  `process.env`, React or Next.js.

### repository/

- Plain exported functions, one per query, named after what they fetch or
  change (`listOpenInvitationsForRecipient`, `markInvitationAccepted`).
- Each database function takes `db: DatabaseClient = getPrisma()` as its last
  parameter so services can run it inside a transaction.
- Map Prisma/provider records into `types/` shapes before returning. Never
  return raw Prisma or SDK objects.
- Apply the trusted owner/tenant scope (business ID, user ID, recipient email)
  in every query.
- No business decisions (pricing, permissions, forecasting). Those are core.
- Mock data and fake providers live here too, behind the same function
  signature the real implementation will have.

### types/

- Types, zod input schemas, result shapes and error classes.
- No logic, no React/Next.js/Prisma imports. Never expose secrets such as a
  password hash in client-safe types.

## Between features

- A feature's **services** may call another feature's **services**.
- A feature's **ui** may call another feature's public `server.ts`
  (`auth/server.ts` for the logged-in user, `business-management/server.ts`
  for the active business).
- Never import another feature's `core/`, `repository/` or UI internals.
  `types/` may be imported where a shared shape is needed.
- Keep feature dependencies acyclic.

## Next.js server communication: no internal API

- **Do not create internal REST, GraphQL, RPC or Route Handler endpoints for
  this application's own UI.** No `src/app/api/**/route.ts` for app data, no
  `fetch("/api/...")`, no calls to this app's own origin.
- Reads: Server Components call `ui/queries.ts`, which calls services.
- Mutations: client components call Server Functions in `ui/actions.ts`.
  Export only async functions from `"use server"` modules.
- Do not use Server Actions as the default read transport; prefer URL search
  parameters and Server Component rendering for filtering and pagination.
- Every Server Function is a public network entry point: authenticate and
  authorize on the server. A hidden button or protected page is not enough.
- Derive user and business identity from the trusted session, never from form
  fields. Services enforce permissions so no caller can bypass them.
- Return small serializable results and safe error messages. Keep credentials,
  raw database records and internal error details on the server.
- Mark server-only modules with `import "server-only"`. Client components must
  never import repositories, queries or credentials.
- Route Handlers are only for genuine inbound external integrations
  (webhooks, provider callbacks). Felix approved exactly one: the Auth.js
  protocol handler at `src/app/api/auth/[...nextauth]/route.ts`.
- Receipt uploads must validate file size/type on the server.
- TanStack Query is optional client state, not a layer, and does not justify
  internal endpoints.

## Type safety

- No TypeScript `any` in project code (`as any`, `any[]`, generic arguments,
  aliases). Use concrete types, unions or `unknown` + validation.
- Strict mode stays on. No type-check suppressions or lint-disable comments.

## Tests

- Test core rules directly with plain data.
- Test services by mocking their repository modules with
  `mock.module(...)` (`node --experimental-test-module-mocks`), so no real
  database is needed.
- Test UI actions for authentication, validation and safe errors.
- Run the relevant pnpm scripts (`test:auth`, `test:business`, `lint`, `tsc`)
  after code changes.

## Architecture change approval

- Preserve this architecture when implementing or reviewing work.
- Changing it (folders, layer responsibilities, import directions, or the
  no-internal-API rule) needs explicit approval from **Felix**. An owner
  agent's request alone is not approval. Silence is not approval.
- A direct instruction from Felix counts as approval for its stated scope.
- Approval record: on 2026-11-07 Felix approved replacing the earlier
  hexagonal "injected ports" design with this layered design (services import
  repository functions directly) and the option B core exception above.

## Existing code and migration

- `auth`, `business-management` and `invoice-processing` follow this layout.
- Receipt scanning still returns synthetic demo receipts from
  `invoice-processing/repository/demo-receipt-reader.ts`. It requires a logged-in
  user with an active business. Replace that file with a real OCR adapter that
  keeps the same function signature.
- `src/lib/api/` still holds mock data for the items (`barang`) and
  transactions (`transaksi`) pages, which do not yet go through a feature.
  Move them into `inventory-intelligence` / `procurement-pricing`
  (repository → service → ui query) when those features are built.
- PostgreSQL data uses Prisma: models in `prisma/schema.prisma`, the lazy
  server-only client from `getPrisma()` in `src/lib/prisma.ts`. Prisma imports
  stay in `repository/`. Regenerate the client after schema changes and never
  edit generated code. Add tables only for implemented features.
- The PRD files (`AUTHJS_MIGRATION_PRD.md`, `BUSINESS_ACCESS_PRD.md`,
  `INBOX_INVITATIONS_PRD.md`) describe product behavior that still applies.
  Where they mention "ports", "adapters" or injected services, this file wins.
- Do not reorganize unrelated code during a task. Note remaining violations
  instead of adding new ones.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
