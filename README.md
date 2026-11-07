# Onyxa

Scan-first purchasing and expense tracker for Indonesian small businesses (UMKM).

Staff photograph a supplier receipt. The current prototype uploads the image to
Cloudinary and returns demo receipt data for the editable review flow. OCR and
Gemini extraction are not yet connected.

## Features
- **Receipt scanner**: Cloudinary photo upload and editable demo receipt review; OCR + Gemini integration is pending
- **Price change alerts**: flags when a supplier raises the unit price of an item
- **Slow-moving detector**: flags items that haven't been repurchased in an unusually long time
- **Expense categories**: raw materials (COGS), operating costs (OPEX), and assets (CapEx)

## Tech stack
Next.js, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, NextAuth/Auth.js,
Gemini Flash API, OCR API

## Project structure
```text
src/
  app/          Next.js routes, layouts, and global styles
  components/   Shared UI components and application shell
  features/     Features with ui, types, core, repository, and services layers
  lib/          Utilities and existing data-access modules
public/         Static assets
prisma/         Application database schema and Mermaid review diagram
```

New business features belong in `src/features/<feature>/`, using package by
feature with hexagonal boundaries as defined in [AGENTS.md](AGENTS.md).
The `@/*` import alias resolves to `src/*`. Configuration and environment files
remain at the repository root. Use Next.js Server Functions for client-triggered
mutations and server-only queries for reads; do not add internal API endpoints.
Receipt upload and scanning call Server Functions in `invoice-processing`.


## Getting started

**Requirements:** Node.js 22.12+ (Docker uses Node.js 24) and pnpm 10.32.1
(`npm install -g pnpm@10.32.1`)

```bash
git clone https://github.com/tingclarice/onyxa.git
cd onyxa
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, AUTH_URL and Cloudinary settings
pnpm install
pnpm db:deploy              # apply committed account/business migrations
pnpm dev                    # http://localhost:3000
```

Keep local environment files at the repository root and never commit secrets.
The committed `.env.example` contains placeholder values only.
Cloudinary uploads require an authenticated user and accept JPEG, PNG, WebP,
HEIC, or HEIF images up to 8 MB.

## Prisma and PostgreSQL

Prisma 7.10.1 defines nine PostgreSQL application models in
`prisma/schema.prisma`. Review the [schema design](prisma/database-schema.md)
and [detailed Mermaid ER diagram](prisma/database-schema.mmd) before backend
implementation. The initial migration is committed under `prisma/migrations/`.
Auth.js handles sessions; Prisma persists local accounts, businesses, memberships,
invitations, and business preferences. Receipt, inventory, and procurement data
remain demos, explicitly labeled in the application. No seed data is included.

Add your connection string to the root `.env` when ready:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```

Use your provider's required SSL settings and URL-encode special characters in
credentials. Keep this variable server-only. For Supabase or another pooled
service, use a migration-compatible direct/session connection when applying
migrations; no additional connection variable is configured for this setup.

```bash
pnpm db:generate              # generate the typed client, without connecting
pnpm db:validate              # validate the schema, without connecting
pnpm test:db                  # verify lazy initialization and client reuse
```

`pnpm dev` and `pnpm build` generate the client automatically. For standalone
TypeScript checks, run `pnpm db:generate` first. Generated files live in
`src/generated/prisma/` and are excluded from Git, lint, and the Docker context;
the Docker build generates its own client.

In a server-only feature repository adapter, call `getPrisma()` from `@/lib/prisma`.
It checks `DATABASE_URL` on first use and reuses one client across hot reloads.
Importing the helper and building the application require no live database.
Model-specific types and query methods become available as models are added.
Keep feature/UI contracts independent of Prisma's database types.

For subsequent schema changes, use `pnpm db:migrate --name <change>` against
a development database and commit its migration. `pnpm db:deploy` applies
committed migrations in production. Neither command runs during build or app
startup.

## Authentication without SMTP

Email/password signup, login and sign-out use Next.js Server Functions in
`src/features/auth/ui/actions.ts`. NextAuth/Auth.js Credentials manages encrypted
JWT session cookies; Prisma stores local `User` accounts. Passwords use Node
scrypt with independent random salts (N=131072, r=8, p=1), and constant-time
comparison. Signup creates no business and sends no email.

Set a cryptographically random 32+ byte `AUTH_SECRET` in the ignored root
`.env`, plus `AUTH_URL=http://localhost:3000` locally. Set `AUTH_URL` to the
public HTTPS origin in production; keep `AUTH_SECRET` consistent across app
instances. Restart `pnpm dev` after changing environment settings. Apply
`pnpm db:deploy` before starting an environment with the new account model.
Existing ignored Supabase keys were left untouched but are no longer used.

The seven-day session uses HTTP-only cookies with secure cookies over HTTPS.
`src/proxy.ts` refreshes sessions. Protected pages and Server Functions also
resolve the trusted account from the session on the server. Invalid and
deleted-account sessions cannot access protected business operations.
Five failed logins temporarily lock an account for fifteen minutes. Atomic
version checks preserve this bound under concurrent attempts. This password
guessing protection is independent of email delivery; there is no email quota.

Felix approved the narrow Auth.js protocol handler at
`/api/auth/[...nextauth]` in `AUTHJS_MIGRATION_PRD.md`. App UI uses Server
Functions and server `auth()`, without client session polling or business APIs.
Only safe error categories are logged; passwords, tokens and raw driver errors
remain server-side. Run `pnpm test:auth` for service, crypto, adapter and delivery
regressions. Google sign-in, email ownership verification and password recovery
are not implemented. These local accounts are separate from Supabase Auth;
users must sign up locally after switching providers.

Set `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in the same root
environment file. Uploads use an unsigned preset from a Server Function; restrict
the preset to images and a dedicated folder. Sensitive production receipts
still need signed uploads and deliberate retention/access controls.

## Business onboarding and invitations

After signing in, an account without memberships can create a business or wait
for an invitation. Creating a business also creates the user's owner membership
in the same transaction. No business is automatically created during signup.

Owners invite staff by email in **Pengaturan > Anggota usaha**. Invitations are
in-app only and can be issued before signup. The recipient signs in and opens
**View Inbox** from onboarding or the header's Inbox icon, then chooses **Yes**
to join as staff or **No** to decline. No code, secret link or invitation email
is needed. Invites expire after seven days and owners can revoke them.
Acceptance creates membership atomically.

The inbox is scoped to the account's normalized email. Email ownership is not
verified by the current local signup flow; the inbox follows that account email.
The pending badge refreshes on navigation and window focus, without realtime push.
Business-free accounts have no sidebar or bottom business navigation; the inbox
and business-creation page remain available. The right-side menu is removed.

Business switching and the create-another-business link live in **Pengaturan**.
Selection stays in an HTTP-only cookie and is rechecked against current membership.
Account/business changes reset the relevant client cache. Business profile, alert
preferences, members and invitations use PostgreSQL, with owner-only mutations.

`src/features/business-management/` owns this capability, with contracts/ports in
`types/`, pure policies in `core/`, injected use cases in `services/`, Prisma
adapters in `repository/`, and delivery/wiring in `ui/`. Its public `server.ts`
entry exposes authorized business context without exposing private adapters.
The existing auth feature uses the same layers.

Apply the committed database migration before using business features:

```bash
pnpm db:deploy
pnpm test:business
```

Business tests use fakes and adapter/action mocks; they create no live
accounts, businesses, invitations, or memberships. To verify the live flow, use
two test accounts: create a business with the first, invite the second's email,
then choose Yes in the second account's inbox. The second account should
remain business-free until it accepts or deliberately creates a business.

## Docker deployment

The Dockerfile builds Next.js standalone output and runs it as a non-root user
on container port `3000`. The build uses the frozen pnpm lockfile; local
dependencies, build output, and environment files are excluded by `.dockerignore`.

The workflow in `.github/workflows/deploy.yml` builds and pushes
`ghcr.io/tingclarice/onyxa:latest`, copies `docker-compose.yml` to
`/home/deployer/onyxa`, and runs:

```bash
docker compose pull
docker compose up -d
```

Compose pulls the published image without requiring source code on the VPS.
It loads runtime variables from `/home/deployer/onyxa/.env` through `env_file`.
Add new runtime variables to that file without editing Compose. An empty
`DATABASE_URL` is allowed until a feature uses Prisma. The workflow does not
upload the environment file or run database migrations.

The app exposes container port `3000` on the existing external `npm_default`
network, without publishing a host port. Configure the reverse proxy on that
network to forward HTTP traffic to `onyxa:3000`. `APP_PORT` is no longer used.

For a local image build and smoke test:

```bash
docker build -t onyxa:local .
docker run --rm --init --env-file .env -p 3000:3000 onyxa:local
```

The VPS needs Docker Compose v2, GHCR pull access, and the SSH credentials used
by the workflow. Provision the database, Auth.js and Cloudinary runtime variables on the
VPS before deployment. Google fonts are downloaded during the build, so the
builder needs outbound network access.

## Contributing
- Use pnpm only (no `package-lock.json`)
- Work on a feature branch and open a pull request into `main`
- Commit style: `feat(web): ...`, `fix(api): ...`, `docs: ...`, `chore: ...`

## Team
Felix, Eileen, Clarice
