# Project architecture rules

## Required architecture

Use **package by feature** for ownership and **hexagonal architecture** inside
each feature. Group business capabilities together, then separate their core
logic from UI, persistence, and external services.

- Place business features under `src/features/<feature>/`.
- Keep `src/app/` as the Next.js routing and composition layer. Route
  files delegate to features; they do not contain business rules or database
  queries.
- Keep feature-specific components, hooks, schemas, and logic in their feature.
  Do not add global `services/`, `repositories/`, or `use-cases/` folders that
  scatter one feature across the project.
- Keep generic UI primitives in `src/components/ui/`, shared application shell
  UI in `src/components/`, and genuinely feature-independent utilities and
  technical clients in `src/lib/`. Shared code must not import feature internals.
- Keep application code under `src/`; `@/*` resolves to `src/*`. Keep `public/`,
  project configuration, environment files, and this `AGENTS.md` at the root.
  Do not create a competing root-level `app/` directory.

## Feature structure

Use these five folders for each feature. Read the folder's `README.md` before
working in it. Add other folders only when actual code needs them; do not add
implementation stubs just to fill out the structure.

```text
src/features/<feature>/
  ui/                         # Delivery: React UI, Next.js server entry points
    README.md
  types/                      # Contracts: types, DTOs, validation schemas, ports
    README.md
  core/                       # Pure business rules and calculations
    README.md
  repository/                 # Data adapters: Prisma queries and external SDKs
    README.md
  services/                   # Use cases: coordinate repository ports and core
    README.md
```

The three main packages are `invoice-processing`, `inventory-intelligence`, and
`procurement-pricing`. Establish boundaries from actual behavior; a URL or
database table does not automatically require its own feature.

`auth` owns account identity. `business-management` owns business onboarding,
membership, active-business selection, and in-app invitations. Signup is
account-only; business creation and invitation acceptance are separate use cases.

## Architecture change approval

- Preserve this architecture when implementing or reviewing work.
- If an agent or its owner wants to change the architecture, the agent must
  ask its owner to obtain explicit approval from **Felix** before proceeding.
  An owner agent's request alone is not approval from Felix.
- This includes changing the feature-based organization, renaming or replacing
  layers, changing layer responsibilities or dependency direction, and making
  exceptions to the no-internal-API rule.
- Keep the proposed change pending until Felix approves it. Continue independent
  work that fits the existing architecture. Silence is not approval.
- A direct instruction from Felix to change the architecture counts as approval
  for that stated scope. If his approval is already recorded in the task context,
  follow it without requesting the same approval again.
- Routine implementation inside the agreed layers, and authorized refactoring
  of legacy code into those layers, do not require a new architecture approval.

## Dependencies and boundaries

- `ui/` is the delivery layer: components, UI hooks, request parsing, and response
  presentation. Keep UI state and formatting here, but no business decisions or
  database queries. Next.js Server Functions replace API routes/controllers in
  this project; do not introduce Express or internal Route Handlers.
- `types/` defines contracts: TypeScript types, interfaces, DTOs, input schemas,
  and repository ports. Keep it independent of the other feature layers, React,
  Next.js, Prisma, and provider SDKs. Do not leak ORM/provider types into contracts.
- Use `core/` consistently; do not create a second `domain/` folder. Core accepts
  data, applies business rules, and returns data. It may depend on `types/`, but
  never UI, services, repositories, frameworks, database drivers, or HTTP clients.
  Pass the current date and other varying dependencies as inputs to keep it pure.
- `repository/` implements the ports in `types/`. Keep Prisma queries, external
  API/SDK calls, and persistence/provider-to-contract mapping here. Repositories
  perform data access, not pricing, forecasting, or authorization policy decisions.
  Apply the trusted owner/tenant scope in every relevant query; business-rule
  separation is not permission to omit ownership filters.
- `services/` orchestrates use cases: load through repository ports, call core
  functions, and persist through ports when needed. It must not contain the math,
  raw Prisma queries, HTTP calls, Next.js cookie handling, or React code.
- Preserve hexagonal dependency direction: services receive typed repository
  dependencies from `types/`, rather than importing concrete repository modules.
  Runtime calls reach repositories; source dependencies of core/services stay
  independent of adapters. No dependency-injection container is required.
- Wire concrete repositories into services at the server-only delivery boundary,
  for example in `ui/queries.ts` or a helper used by `ui/actions.ts`. Client UI
  must never import repositories, server queries, server wiring, or credentials.
  It may import Server Functions from a dedicated `"use server"` module.
- Mark server entry points and modules containing server-only data access or
  credentials with `import "server-only"`. Dedicated action modules use
  `"use server"`; keep their helpers in separate server-only modules.
- Keep Next.js redirects, cache invalidation, cookies, and transport error
  mapping in delivery entry points, separate from core and services.
- Import another feature only through an explicit public contract or
  service entry point. Never import its private adapters or UI
  internals. Keep feature dependencies acyclic; compose cross-feature workflows
  through explicit use cases and ports when needed.
- Keep client-safe exports separate from server-only exports. Do not create a
  barrel that mixes UI/contracts with database clients or server composition.

## Next.js server communication: no internal API

- **Do not create internal REST, GraphQL, RPC, or Route Handler endpoints for
  this application's own UI.** Do not add `src/app/api/**/route.ts`, Pages API
  routes, or equivalent endpoints elsewhere to bypass this rule.
- Do not call the application over HTTP from itself: no `fetch("/api/...")`,
  Axios wrappers for internal endpoints, or server-to-server calls to this
  application's own origin.
- For reads, prefer Server Components calling feature server queries directly,
  for example `ui/queries.ts`. Queries call services with their repository
  dependencies wired at the server edge. Ordinary server-only functions do not
  need the `"use server"` directive.
- For client-triggered mutations, use Next.js Server Functions in feature
  `ui/actions.ts` modules with a file-level `"use server"` directive. Export
  only async Server Functions from those modules. Use React action mechanisms
  and pending/error handling appropriate to the interaction.
- Do not make Server Actions the default query transport. Prefer URL search
  parameters and Server Component rendering for filtering and pagination.
  If a read genuinely needs imperative client invocation, keep its Server
  Function narrow and document the reason; do not introduce an internal API.
- Server Functions remain thin adapters: validate untrusted input, resolve the
  trusted session, invoke an authorized use case, map its result, and perform
  any required Next.js cache invalidation or navigation.
- Treat each Server Function as a reachable network entry point. Authenticate
  and authorize protected operations on the server; a protected page or hidden
  button is insufficient. Public operations need explicit public-access rules.
- Derive actor/tenant identity from the trusted session. Enforce ownership and
  permissions in application use cases so alternate callers cannot bypass them.
  Validate input at the boundary and enforce business invariants in the core.
- Return minimal React-serializable results and explicit expected-error data.
  Keep credentials, raw database records, SDK objects, and internal error details
  on the server.
- External services may be called from repository adapters. Reserve Route
  Handlers for genuine inbound external integrations, such as webhooks or
  provider callbacks, when required by the task. Explain why that integration
  requires HTTP; it must not become an internal UI API.
- Use installed Next.js documentation for action invocation, caching, upload
  limits, and other version-dependent behavior. Receipt uploads must validate
  file size/type server-side and deliberately handle framework payload limits.
- TanStack Query is optional client state machinery, not an architecture layer.
  Its presence does not justify internal endpoints or duplicating server data
  fetching and cache ownership.

```text
Read:     ui/ Server Component -> ui/ query -> services/ -> repository port
Mutation: ui/ client/form -> ui/ Server Function -> services/ -> repository port
Rules:    services/ -> core/ -> types/
Data:     repository implementation -> database or external provider
```

The arrows above show runtime calls. Repository implementations satisfy ports
declared in `types/`; core and services never import concrete adapters.

## Type safety

- Do not use TypeScript `any` in project-owned code, explicitly or implicitly.
  This includes `as any`, `any[]`, generic arguments, and aliases hiding `any`.
- Interfaces are allowed for every function, including callable interfaces and
  input/output contracts. They are optional; preserve dependency boundaries
  whether a function uses an interface or a directly typed signature.
- Use concrete types, constrained generics, or discriminated unions for known
  data. Use `unknown` for untrusted or genuinely unknown values, then narrow or
  validate them before use. Treat untyped dependency results as `unknown` at
  the boundary so `any` cannot leak into application code.
- Keep TypeScript strict mode enabled. Do not bypass these rules with type-check
  suppressions, lint-disable comments, or unchecked assertions.

## Keep the architecture proportional

- Keep the five documented folders, but do not generate extra layers or
  pass-through code. Add a port when a use case actually
  needs persistence, an external service, or another replaceable dependency.
- Keep pure calculations pure. Interfaces for functions are allowed; they do
  not require wrapper classes or extra layers. Do not require a repository for
  every table or a use-case class for every button.
- Keep a feature's contracts and validation local until another real consumer
  needs them. Do not duplicate domain models just to populate every layer.
- Test meaningful domain rules and use cases without Next.js or a real database,
  using small fakes for ports. Verify adapter mappings and action validation,
  authorization, and error behavior where the change warrants it.
- For implementation changes, run relevant checks with the repository's pnpm
  scripts and the applicable project instructions. Documentation alone does
  not require an application build.

## Existing code and migration

These rules are the target architecture, not a claim that all current code
already complies. Apply them to new work and migrate touched behavior in
coherent steps that keep its callers working.

- Receipt scanning uses the Server Function in
  `src/features/invoice-processing/services/actions.ts`; do not recreate an API
  route or HTTP fetch wrapper. It currently returns synthetic demo receipts.
  It requires an authenticated user with an active business membership. Keep server-side image validation before
  connecting real merchant data or external OCR services.
- Authentication lives in `src/features/auth/`. Use `requireUser()` in
  protected Server Functions; a layout guard
  alone does not protect direct calls. Supabase clients belong in `src/lib/supabase/`.
  Use the publishable key for user sessions, never a secret/service-role key.
- PostgreSQL application data uses Prisma, with models in `prisma/schema.prisma`
  and a server-only, lazy client from `getPrisma()` in `src/lib/prisma.ts`.
  Keep Prisma imports and database queries in feature `repository/` adapters. Map
  records into feature contracts before returning them to UI or core logic.
  Business, membership, and invitation models are implemented; purchasing
  persistence is still pending. Add tables only for implemented features.
  Regenerate the client after schema changes. Do not edit generated client code
  or use migrations to manage Supabase's authentication tables.
- Move remaining feature-specific mock data from `src/lib/api/` and feature UI
  folders into their owning features when that behavior is migrated. These mock
  modules are ordinary functions, not HTTP endpoints. Preserve reusable UI
  primitives and shared shell components.
- Put mock persistence and fake external services behind the same application
  ports as real adapters. Do not hardcode mock responses in pages or actions.
- Do not reorganize the entire application solely to implement an unrelated
  task. Record remaining architecture violations without adding new ones.
- Auth Server Functions/session delivery live in `auth/ui/`, provider calls in
  `auth/repository/`, and pure outcome policies in `auth/core/`. Other features
  use `auth/server.ts` for trusted identity and `business-management/server.ts`
  for authorized business context. Receipt scan modules still mix some
  responsibilities under `services/`; migrate them only during an authorized
  implementation/refactoring task.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
