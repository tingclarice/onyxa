# Business management: testing/

Test-only helpers. Never imported by app code.

| File | What it has |
|---|---|
| `in-memory-database.ts` | `installInMemoryDatabase()` swaps the repository modules and `runInTransaction` for an in-memory version, so tests run the real services without PostgreSQL |
| `sample-data.ts` | small shared records (owner, staff, business, invitation) |
