# Authentication: types/ — shared shapes

Types, zod schemas, result shapes and error classes used by every layer.

## In this feature

Auth shapes.

| File | What it has |
|---|---|
| `auth.ts` | `createAuthSchema`, `AuthUser`, `LoginState`, `CredentialAccount`, `AuthResult`, `AccountExistsError` |

## Rules

- No logic and no imports except `zod`.
- Never put secrets (e.g. password hashes) in types sent to the browser.

See the root [AGENTS.md](../../../../AGENTS.md) for the full flow. Changing the architecture needs Felix's approval.
