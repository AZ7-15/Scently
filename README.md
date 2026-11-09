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


### Enable Gemini AI

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/api-keys). Restrict it to the Gemini API.
2. In Render, open **Scently → Environment → Add Environment Variable**. Set `GEMINI_API_KEY` to the key. Optionally set `GEMINI_MODEL`; the default is `gemini-3.8-flash`.
3. Save changes and let Render redeploy. The finder calls Gemini from the server; the key is never sent to the browser.

For local development, paste the key into `.env.local` as `GEMINI_API_KEY=...`. Never commit `.env.local` or paste the key into chat/source code.

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

`GEMINI_API_KEY` enables Gemini preference interpretation and grounded web research for the finder; `GEMINI_MODEL` optionally selects a model and defaults to `gemini-3.8-flash`. Without a key, the finder uses its rule-based interpretation and local catalog ranking. Google Search grounding prioritizes Fragrantica and recognized fragrance review sources. Fragrance performance uses matching Scento profile data first, then grounded web research for exact editions where Scento has no value. Scento's documented longevity bands are shown as hour ranges; projection uses reported sillage categories or explicit projection durations. Unsupported values remain unavailable. Performance values are shown without source names or links. Google may charge for grounded searches after included quota. Finder and fallback research share a 1,000-request monthly application cap. Retailer feeds, Google OAuth, email verification and email-based password recovery are not configured. Passwords use salted scrypt hashes. Caller-supplied platform identity headers are ignored.

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

If the Render server cannot complete a free Open Beauty Facts lookup, the browser tries the public API directly for a still-missing photo. Browser lookups are limited to 20 per minute and keep the same exact-edition checks.

`/fragrances` is one catalog with one search and filter panel. Search any fragrance or brand to combine local records with on-demand results from the free [Scento Perfume API](https://www.scento.com/developers/perfume-api). Matching records are deduplicated by brand, name and concentration; local reviews are preserved. Distinct concentration variants remain separate. “Load more” follows the source cursor. The default listing browses the source catalog through pagination; choosing brand, note or family sends the filter upstream and each page is validated against the combined criteria. Brand options come from the full source directory rather than loaded cards. Unknown performance and prices do not pass evidence-based filters. The provider does not cover every fragrance worldwide.

Read-only JSON endpoints are `/api/discovery/search?q=Lattafa` (optionally `continuation`) and `/api/discovery/fragrance/khamrah-lattafa`. Lookups use a bounded 128-answer, 15-minute cache, request coalescing, timeout and upstream rate limits. The live API is not crawled. A separately published, licensed export is also bundled and refreshed with attribution. Use follows the [source API terms](https://www.scento.com/terms-of-service#perfume-api).

Product photos use bundled manufacturer and verified retailer assets first. Their source links are recorded in `data/photo-sources.json` and `data/retailer-photos.json`; 39 of the 1,479 bundled open-catalog records currently have stored bottle photos. Other records look for matching photos on Scento product pages, the free no-key [Open Beauty Facts API](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-cosmetics-pet-food-and-other-products/), and exact-name retailer product searches. The Open Beauty Facts fallback accepts only a matching brand, fragrance name and known concentration, and credits its product page under the [CC BY-SA image license](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/). Add `CONTACT_EMAIL` in Render for the API User-Agent. Photos load near the viewport and try another matched image if a URL fails. Missing photos are labeled; no unrelated or generated bottle is substituted. Free sources do not cover every fragrance, and their availability can change. Lookups are bounded, cached and rate limited.

Legacy source-selection URLs open the same combined catalog. The finder retrieves candidate products from Scently's catalog and uses Gemini with Google Search grounding to research fragrance fit, preferring Fragrantica profiles and the matching brand's official product pages. Only exact catalog IDs can be returned, and results show their supporting source links. Explicit masculine/feminine requests exclude the opposite audience; a sourced unisex fragrance may also appear. Catalog pages and product-photo providers remain separate from finder research. This does not import or reproduce Fragrantica's catalog or photographs.

The starter catalog contains **six** sourced fragrances. Actual manufacturer photos are bundled in `public/images/products`, with provenance in `data/photo-sources.json` and visible source links. Photos belong to their rights holders; attribution does not establish a commercial license or brand partnership. No Fragrantica photographs are included. A complete Fragrantica catalog has not been imported.

The admin UI supports JSON/CSV preview, validation, duplicate detection, edits, offers and moderation. Imports accept 100 records / 110 KB at a time and do not overwrite existing records. Large-catalog database-side search and pagination remain additional work. Missing reviews, performance and prices are displayed as missing evidence.

Append migrations instead of changing applied SQL files. SQLite/libSQL migrations use transactions and recorded checksums. See [integrations](docs/integrations.md) and [data rules](docs/data-rules.md).

### Accuracy checks across brands

All source records use the same name, brand and concentration checks. Search results are re-filtered locally because the upstream provider can return unrelated suggestions. External profile links carry the expected identity; a different source profile is withheld. Photo requests and cache keys include concentration. A known concentration needs explicit, unambiguous matching evidence from the photo source, otherwise the photo remains unavailable.

These checks prevent identity mismatches; they do not independently verify every provider fact or guarantee a photo for every record. The cross-brand audit and its scope are recorded in [accuracy audit](docs/accuracy-audit.md).

## Shared visual system

The landing page and catalog use the same bottle and note imagery, typography, controls and surface styles as the detail pages. Both detail routes render components/scently/fragrance-story.tsx, including all saved records and source-backed profiles. Real community actions remain available for saved records. See [design consistency](docs/design-system.md) before changing a detail layout.

## Expanded flanker index and arrivals

The full published Scento Open Dataset (bundled edition: 1,479 records dated 2026-10-29) is combined with live listings. It is licensed CC BY 4.0, attributed in the catalog and profiles, and mapped without fabricated dates, images, prices or ratings. The publisher export is checked at most daily; validation or network failure retains the bundled copy. See [dataset license](data/scento-open-catalog.LICENSE.md).

Search a house or a range such as Club de Nuit, Le Male or Libre to discover its indexed editions. Known concentrations and differently named flankers remain distinct. New arrivals queries the live source feed, refreshed through its short cache; it means newly added to the supplier catalog, not necessarily newly launched worldwide. No free source guarantees every house, edition or latest global release.

Catalog search defaults to popularity order using Scento's published best-known rank when available. Unranked editions follow the catalog's existing order.

Catalog duplicate audit: run `npx tsx scripts/audit-catalog.ts` to check every shipped record and write `outputs/catalog-duplicate-audit.json`. House and collection aliases (such as Emporio Armani and Replica) share edition identities; actual flankers and known concentration variants remain separate.

## Detail pages, photos and performance research

All profile routes use the same composition, seasons, wear, reviews, retailer and related-fragrance sections. Source-only records explain unavailable community features; matching starter profiles redirect to their canonical community page. Bottle images survive duplicate merging with separate source credits. Image lookup understands house and collection aliases, matched product-page metadata, explicit manufacturer/retailer CDN hosts and retryable transient capacity failures. Missing images can be retried.

Scently requests matching longevity and sillage scores from the free Perfume Picks community API on each fragrance detail page. Scores are shown out of five with source attribution; they are not converted to hours or a measured projection distance. The API does not supply vote totals, and unmatched fragrances remain without a score. Scently's own review reports remain separate.
