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
apps/web Frontend (Next.js)
apps/api Backend and database
packages/ai OCR and extraction pipeline
contracts Shared data schema between web, api, and ai
docs Project documentation


## Getting started

**Requirements:** Node.js 20+ and [pnpm](https://pnpm.io) (`npm install -g pnpm`)

```bash
git clone https://github.com/tingclarice/onyxa.git
cd onyxa
cp .env.example .env        # fill in your own keys
cd apps/web
pnpm install
pnpm dev                    # http://localhost:3000
```

Never commit `.env`. Only `.env.example` (with empty values) belongs in the repo.

## Contributing
- Use pnpm only (no `package-lock.json`)
- Work on a feature branch and open a pull request into `main`
- Commit style: `feat(web): ...`, `fix(api): ...`, `docs: ...`, `chore: ...`

## Team
Felix, Eileen, Clarice