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

Render injects `PORT`; the app listens on `0.0.0.0`. The Blueprint disables auto-deploy on commits; services created manually might enable it. Free service cold starts and provider quotas apply. Preparing these files does not itself create a Render service.

### If Render reports missing Turso secrets

Turso stores account and community data; the fragrance API is a separate reference source. In the Turso dashboard, create a **libSQL** database and a database authentication token with write access (schema migrations require it). In **Render > scently > Environment > Add Environment Variable**, add:

```text
TURSO_DATABASE_URL=libsql://your-actual-database-host.turso.io
TURSO_AUTH_TOKEN=your-actual-database-token
```

Use your actual values, not the examples. Save, rebuild/redeploy, then visit `/api/health`. A working database returns `status: ok`. The current app also supports **browse-only mode**: when either database secret is missing, public browsing and live API lookups work, accounts/review writes return 503, and health explicitly reports `mode: browse-only, database: not_configured`. No user data is written to ephemeral Render storage. Configured but broken database credentials still produce a failing health check instead of hiding the failure.

The Turso CLI alternatives are `turso db create scently`, `turso db show scently --url`, and `turso db tokens create scently`. Keep token output private. Database setup: [create](https://docs.turso.tech/cli/db/create), [token](https://docs.turso.tech/cli/db/tokens/create).

The previous Sites deployment remains independent. Its D1 data and ChatGPT accounts are **not automatically transferred**. Older scaffold files remain as reference; the npm scripts now use standard Next.js. Do not deploy this build with the old Worker publication workflow.

## Configuration

See `.env.example`. Render requires both Turso variables for account/community storage and refuses ephemeral local storage. Public browsing supports missing-configuration mode as described above. Local development uses `SCENTLY_DB_PATH` unless Turso is configured. `NEXT_PUBLIC_SITE_URL` optionally overrides the canonical URL; Render's assigned URL is otherwise detected automatically. `CONTACT_EMAIL` sets the operator contact address.

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

`/fragrances` now searches the free [Scento Perfume API](https://www.scento.com/developers/perfume-api), without a key or paid subscription. Search any fragrance or brand, including brands outside the suggestions. “Load more” follows the source's continuation cursor. `/discover/[lookup]` shows available note pyramids, composition, concentration, year, perfumer and source attribution. The source does not supply every field for every record or cover every fragrance worldwide. It does not provide product photos through these endpoints.

Read-only JSON endpoints are `/api/discovery/search?q=Lattafa` (optionally `continuation`) and `/api/discovery/fragrance/khamrah-lattafa`. Lookups use a bounded 128-answer, 15-minute cache, request coalescing, timeout and upstream rate limits. There is no whole-database crawling or mirroring. Use follows the [source API terms](https://www.scento.com/terms-of-service#perfume-api).

`/fragrances?view=community` retains the locally sourced catalog, filters, collections and community reviews. The finder still ranks that community catalog; API results do not become invented community ratings or verified offers.

The starter catalog contains **six** sourced fragrances. Actual manufacturer photos are bundled in `public/images/products`, with provenance in `data/photo-sources.json` and visible source links. Photos belong to their rights holders; attribution does not establish a commercial license or brand partnership. No Fragrantica photographs are included. A complete Fragrantica catalog has not been imported.

The admin UI supports JSON/CSV preview, validation, duplicate detection, edits, offers and moderation. Imports accept 100 records / 110 KB at a time and do not overwrite existing records. Large-catalog database-side search and pagination remain additional work. Missing reviews, performance and prices are displayed as missing evidence.

Append migrations instead of changing applied SQL files. SQLite/libSQL migrations use transactions and recorded checksums. See [integrations](docs/integrations.md) and [data rules](docs/data-rules.md).
