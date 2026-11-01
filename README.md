# Scently

Fragrance discovery with search, comparisons, reviews, private collections, a catalog-backed finder, and protected administration.

## Run locally

Install Node.js 24 LTS and npm. Open a terminal in this folder:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:5173. Local data lives in ignored `storage/scently.sqlite`. Migrations and missing starter records initialize automatically. Create an account at `/login`; passwords require 12 characters. Sessions use HTTP-only cookies and expire after 30 days.

## Deploy on Render for free

The app now runs on **Next.js / Node.js**. Render production uses an external **Turso libSQL** database, preserving the existing SQLite schema and Drizzle queries.

1. Publish this folder to GitHub. `.gitignore` excludes secrets and local databases.
2. Create a free database at [Turso](https://turso.tech). Choose **libSQL**, which supports `@libsql/client`. Copy its database URL and create an authentication token.
3. In [Render](https://dashboard.render.com), choose **New > Blueprint** and connect the repository. Use `render.yaml`. If the repository contains this project inside `scently/`, use `scently/render.yaml` and set Root Directory to `scently`.
4. Set `TURSO_DATABASE_URL` and secret `TURSO_AUTH_TOKEN` in Render's environment settings. Never put the token in Git or browser environment variables. The Blueprint specifies a **free** service and no paid disk.
5. Deploy. `/api/health` initializes and checks database migrations. Starter records insert only when missing. Existing edits are preserved.
6. Create a Scently account and visit `/api/me` while signed in. Add `user.id` to Render's `ADMIN_USER_IDS`, then restart/redeploy to access `/admin`. Empty denies all admin access.

Manual Web Service settings:

| Setting            | Value                                    |
| ------------------ | ---------------------------------------- |
| Runtime / instance | Node / Free                              |
| Node               | 24.22.1                                  |
| Build command      | `npm ci --include=dev && npm run build`  |
| Start command      | `npm start`                              |
| Health check       | `/api/health`                            |
| Required secrets   | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |

Render injects `PORT`; the app listens on `0.0.0.0`. Auto-deploy on commits is off. Free service cold starts and provider quotas apply. Preparing these files does not itself create a Render service.

The previous Sites deployment remains independent. Its D1 data and ChatGPT accounts are **not automatically transferred**. Older scaffold files remain as reference; the npm scripts now use standard Next.js. Do not deploy this build with the old Worker publication workflow.

## Configuration

See `.env.example`. Render requires both Turso variables and refuses ephemeral local storage. Local development uses `SCENTLY_DB_PATH` unless Turso is configured. `NEXT_PUBLIC_SITE_URL` optionally overrides the canonical URL; Render's assigned URL is otherwise detected automatically. `CONTACT_EMAIL` sets the operator contact address.

`OPENAI_API_KEY` and `OPENAI_MODEL` optionally enable AI interpretation. Without them the finder labels its rule-based fallback. Retailer feeds, Google OAuth, email verification and email-based password recovery are not configured. Passwords use salted scrypt hashes. Caller-supplied platform identity headers are ignored.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
$env:PORT='4180'
$env:SCENTLY_DB_PATH='./storage/browser-test.sqlite'
npm start
```

In another terminal, set `$env:E2E_BASE_URL='http://localhost:4180'` and run `npm run test:e2e`. Playwright uses installed Chrome. Tests mutate accounts, reviews and collections: use an isolated database, never live user data. On Windows, the native libSQL test driver needs Microsoft's Visual C++ runtime; production uses the HTTP-only driver.

## Catalog and photos

The starter catalog contains **six** sourced fragrances. Actual manufacturer photos are bundled in `public/images/products`, with provenance in `data/photo-sources.json` and visible source links. Photos belong to their rights holders; attribution does not establish a commercial license or brand partnership. No Fragrantica photographs are included. A complete Fragrantica catalog has not been imported.

The admin UI supports JSON/CSV preview, validation, duplicate detection, edits, offers and moderation. Imports accept 100 records / 110 KB at a time and do not overwrite existing records. Large-catalog database-side search and pagination remain additional work. Missing reviews, performance and prices are displayed as missing evidence.

Append migrations instead of changing applied SQL files. SQLite/libSQL migrations use transactions and recorded checksums. See [integrations](docs/integrations.md) and [data rules](docs/data-rules.md).
