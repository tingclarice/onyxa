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
Next.js, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Supabase Auth,
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
cp .env.example .env        # fill in Supabase/Cloudinary settings; add DATABASE_URL when ready
pnpm install
pnpm dev                    # http://localhost:3000
```

Keep local environment files at the repository root and never commit secrets.
The committed `.env.example` contains placeholder values only.
Cloudinary uploads require an authenticated user and accept JPEG, PNG, WebP,
HEIC, or HEIF images up to 8 MB.

## Prisma and PostgreSQL

Prisma 7.10.1 defines eight PostgreSQL application models in
`prisma/schema.prisma`. Review the [schema design](prisma/database-schema.md)
and [detailed Mermaid ER diagram](prisma/database-schema.mmd) before backend
implementation. The initial migration is committed under `prisma/migrations/`.
Supabase handles authentication; Prisma persists businesses, memberships,
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

## Supabase authentication

Email/password signup, login, email confirmation, and sign-out use Next.js Server
Functions in `src/features/auth/ui/actions.ts`. Supabase sessions live in
HTTP-only cookies. `src/proxy.ts` refreshes sessions, and the authenticated layout
and protected Server Functions verify the user server-side. Production cookies
require HTTPS. Google sign-in and password recovery are not implemented.

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the root `.env`. Authentication
does not use `SUPABASE_SECRET_KEY` or a service-role key. These settings are read
at runtime, so the same Docker image can be deployed without baking in keys.
Set `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in the same root
environment file. Uploads use an unsigned preset from a server action; no
Cloudinary API secret is required or exposed to the browser. Restrict the preset
to image uploads and a dedicated folder. For sensitive production receipts,
add a signed-upload flow and explicit retention/access controls.

In the Supabase dashboard:

1. Enable the Email provider and email/password signup. Keep **Confirm email**
   enabled if accounts should require verification.
2. Set **Authentication > URL Configuration > Site URL** to the application's
   public origin (for example, `http://localhost:3000` in local development and
   your HTTPS domain in production). Allow the corresponding confirmation URL.
3. In **Email Templates > Confirm signup**, use this confirmation link:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}">Konfirmasi email</a>
   ```

The confirmation link opens a page; the user clicks **Konfirmasi email** to
submit the token to a Server Function. Opening or prefetching the page does not
consume the token. The default Supabase confirmation template must be updated
for this flow. If confirmation is disabled, successful signup logs in immediately.
Only the user's name is stored in signup metadata. Signup requires no business
name and creates no business or membership. Business permissions come from
active database memberships, never Supabase user metadata.

Run authentication regression tests with `pnpm test:auth`. They use a fake auth
provider and do not create Supabase accounts or send emails. Live testing needs
a test account and the dashboard configuration above.

Authentication failures display an allowlisted **Kode bantuan**; provider codes,
operation, and HTTP status are logged as `[auth]` in the terminal running Next.js.
Raw provider messages, passwords, keys, and tokens are not logged or returned.
`email_address_invalid` means the address was rejected by Supabase's email
validator; example/test addresses are unsupported. Use an inbox you control.
`email_address_not_authorized` means the built-in sender cannot send to that
recipient; configure custom SMTP to support addresses outside the Supabase
organization. See [Supabase's error reference](https://supabase.com/docs/guides/auth/debugging/error-codes)
and [SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

## Business onboarding and invitations

After signing in, an account without memberships can create a business or wait
for an invitation. Creating a business also creates the user's owner membership
in the same transaction. No business is automatically created during signup.

Owners invite staff by email in **Pengaturan > Anggota usaha**. Invitations are
in-app only and may be created before a recipient signs up. The recipient signs
in with that verified email and accepts or rejects the invitation in the
hamburger menu. Pending invitations expire after seven days. Owners can revoke
them. Membership is granted only on acceptance, in an atomic transaction.

The hamburger badge refreshes on page navigation, window focus, menu opening,
or the **Perbarui undangan** button; it does not use realtime push or send email.
The menu also switches among the account's businesses. Selection is stored in
an HTTP-only cookie and rechecked against current membership. Account/business
changes reset the relevant client cache. Business profile, alert preferences,
members, and invitation settings use PostgreSQL, including owner-only mutations.

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

Business tests use fakes and adapter/action mocks; they create no live Supabase
accounts, businesses, invitations, or memberships. To verify the live flow, use
two test accounts: create a business with the first, invite the second's email,
then accept from the second account's hamburger menu. The second account should
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
by the workflow. Provision the Supabase and Cloudinary runtime variables on the
VPS before deployment. Google fonts are downloaded during the build, so the
builder needs outbound network access.

## Contributing
- Use pnpm only (no `package-lock.json`)
- Work on a feature branch and open a pull request into `main`
- Commit style: `feat(web): ...`, `fix(api): ...`, `docs: ...`, `chore: ...`

## Team
Felix, Eileen, Clarice
