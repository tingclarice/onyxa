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
Next.js, TypeScript, Tailwind CSS, shadcn/ui, Gemini Flash API, OCR API

## Project structure
```text
src/
  app/          Next.js routes, layouts, and global styles
  components/   Shared UI components and application shell
  features/     Business features with types, UI, and services
  lib/          Utilities and existing data-access modules
public/         Static assets
```

New business features belong in `src/features/<feature>/`, using package by
feature with hexagonal boundaries as defined in [AGENTS.md](AGENTS.md).
The `@/*` import alias resolves to `src/*`. Configuration and environment files
remain at the repository root. Use Next.js Server Functions for client-triggered
mutations and server-only queries for reads; do not add internal API endpoints.
Receipt upload and scanning call Server Functions in `invoice-processing`.


## Getting started

**Requirements:** Node.js 22+ (Docker uses Node.js 24) and pnpm 10.32.1
(`npm install -g pnpm@10.32.1`)

```bash
git clone https://github.com/tingclarice/onyxa.git
cd onyxa
cp .env.example .env        # fill in Supabase and Cloudinary values
pnpm install
pnpm dev                    # http://localhost:3000
```

Keep local environment files at the repository root and never commit secrets.
The committed `.env.example` contains placeholder values only.
Cloudinary uploads require an authenticated user and accept JPEG, PNG, WebP,
HEIC, or HEIF images up to 8 MB.

## Supabase authentication

Email/password signup, login, email confirmation, and sign-out use Next.js Server
Functions in `src/features/auth/services/actions.ts`. Supabase sessions live in
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
Name and business name are stored as user metadata, not as authorization roles
or a merchant database record. Existing inventory/settings data remains mocked.

Run authentication regression tests with `pnpm test:auth`. They use a fake auth
provider and do not create Supabase accounts or send emails. Live testing needs
a test account and the dashboard configuration above.

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
The host port defaults to `3000`. To change it, set `APP_PORT` in the VPS shell
or in `/home/deployer/onyxa/.env`. Add `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `CLOUDINARY_CLOUD_NAME`, and
`CLOUDINARY_UPLOAD_PRESET` there too; Compose passes these explicitly named
variables to the application container. The workflow does not upload this file.

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
