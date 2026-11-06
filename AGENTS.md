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

Use this structure as needed; create folders only when they contain real code:

```text
src/features/<feature>/
  domain/                     # Business types, invariants, pure business logic
  application/
    use-cases/                # Operations and orchestration
    ports/                    # Interfaces the use cases need from the outside
  infrastructure/             # Database, storage, external API, mock adapters
  presentation/
    components/               # Feature UI, including Server Components
    hooks/                    # Client interaction hooks
  server/
    composition.ts            # Wire concrete adapters into use cases
    queries.ts                # Server-only read entry points
    actions.ts                # Next.js Server Functions for client invocation
  contracts.ts                # Client-safe input/result types and schemas
```

Feature names describe business capabilities, such as `receipts`, `inventory`,
or `transactions`. Establish boundaries from actual behavior; a URL or database
table does not automatically require its own feature.

## Dependencies and boundaries

- `domain/` depends only on pure, framework-independent code. It must not import
  React, Next.js, database clients, SDKs, request/session APIs, or adapters.
- `application/` depends on the domain and on ports it owns. It must not import
  presentation, infrastructure, Next.js, or concrete database/SDK types.
- Ports describe business needs. Infrastructure implements them and maps
  provider/database records to application or domain types.
- Use cases receive dependencies explicitly, usually as function arguments or
  a small dependency object. Use plain functions and TypeScript interfaces;
  a dependency injection container, base repository, or class hierarchy is not
  required.
- `server/composition.ts` owns concrete wiring. Server queries and actions call
  the wired use cases. UI must not instantiate adapters or access a database.
- Presentation uses feature contracts and server entry points. Client modules
  may import Server Functions from a dedicated `"use server"` module, but must
  never import server queries, composition, adapters, or secrets.
- Mark server entry points and modules containing server-only data access or
  credentials with `import "server-only"`. Dedicated action modules use
  `"use server"`; keep their helpers in separate server-only modules.
- Keep business rules in the domain and application. Next.js redirects, cache
  invalidation, cookies, and transport error mapping belong at the server edge.
- Import another feature only through an explicit public contract or
  application/server entry point. Never import its private adapters or UI
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
- For reads, prefer Server Components calling feature server queries directly.
  Queries call application use cases through the composition module. Ordinary
  server-only functions do not need the `"use server"` directive.
- For client-triggered mutations, use Next.js Server Functions in feature
  `server/actions.ts` modules with a file-level `"use server"` directive. Export
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
- External services may be called from infrastructure adapters. Reserve Route
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
Read:     Server Component -> server query -> use case -> port -> adapter
Mutation: Client/form -> Server Function -> use case -> port -> adapter
```

The arrows above show runtime calls. Source dependencies point inward:
infrastructure implements core-owned ports; the core never imports adapters.

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

- Preserve the boundaries even for small features, but do not generate empty
  layers or pass-through abstractions. Add a port when a use case actually
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

- Existing `src/app/api/scan/route.ts` and the `/api/scan` fetch in
  `src/lib/api/scan.ts` violate the target communication rule. When migrating
  receipt scanning, replace this path with a feature-owned Server Function and
  update its hook, contracts, and callers together before removing the old endpoint.
- Move feature-specific code from `src/lib/api/`, `src/lib/hooks/`,
  `src/lib/contracts/`, and feature UI folders into its owning feature when that
  behavior is migrated. Preserve reusable UI primitives and shared shell components.
- Put mock persistence and fake external services behind the same application
  ports as real adapters. Do not hardcode mock responses in pages or actions.
- Do not reorganize the entire application solely to implement an unrelated
  task. Record remaining architecture violations without adding new ones.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
