# Onyxa

Scan-first purchasing and expense tracker for Indonesian small businesses (UMKM).

Staff photograph a supplier receipt. Onyxa extracts the supplier, date, items,
quantities, and prices, lets the user confirm the result in one step, and turns
the saved data into insights such as price increases and slow-moving items.

## Features
- **Receipt scanner**: OCR + Gemini Flash turn a photo into structured data, with a review screen for low-confidence fields
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
  lib/          Utilities and existing data-access modules
public/         Static assets
```

New business features belong in `src/features/<feature>/`, using package by
feature with hexagonal boundaries as defined in [AGENTS.md](AGENTS.md).
The `@/*` import alias resolves to `src/*`. Configuration and environment files
remain at the repository root. Use Next.js Server Functions for client-triggered
mutations and server-only queries for reads; do not add internal API endpoints.
The existing scan endpoint is a migration target documented in `AGENTS.md`.


## Getting started

**Requirements:** Node.js 20+ and [pnpm](https://pnpm.io) (`npm install -g pnpm`)

```bash
git clone https://github.com/tingclarice/onyxa.git
cd onyxa
pnpm install
pnpm dev                    # http://localhost:3000
```

Keep local environment files at the repository root and never commit secrets.
If adding an `.env.example`, include placeholder values only.

## Contributing
- Use pnpm only (no `package-lock.json`)
- Work on a feature branch and open a pull request into `main`
- Commit style: `feat(web): ...`, `fix(api): ...`, `docs: ...`, `chore: ...`

## Team
Felix, Eileen, Clarice
