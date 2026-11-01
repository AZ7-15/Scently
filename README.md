# Scently

A responsive fragrance discovery application: sourced catalog, community reviews, private collections, comparison, grounded recommendations and protected administration.

## Features

- Original warm-neutral / forest-green interface, mobile navigation, keyboard focus, reduced-motion support, loading and error states.
- Debounced search, partial matching, typo aliases, notes/accords, seasons, budget, performance and advanced filters; paginated results.
- Profiles with source links, note pyramids, editorial accords, real review aggregates and honest missing-data states.
- Authenticated reviews, edit/delete, deduplicated helpful votes, reporting and moderation.
- Persistent wishlist, collection, tried and want-to-test lists; compare up to three fragrances.
- Server-side OpenAI structured preference interpretation with Zod validation and deterministic catalog retrieval/ranking. Labeled rule-based fallback without credentials.
- Region-aware offers, equivalent variants, shipping/tax disclosure, 48-hour expiry and affiliate labeling.
- Admin fragrance editor, JSON/CSV import preview, duplicate detection, offers, retailer activation, moderation and usage summaries.

## Architecture

The existing **Vinext** project (Vite implementation of Next.js App Router on Cloudflare Workers) is preserved. React, TypeScript, Tailwind and Lucide power the UI. **D1 / SQLite and Drizzle** provide normalized persistence. Sites-managed ChatGPT sign-in provides identity. PostgreSQL/Supabase were not introduced because that requires separate credentials and a runtime migration.

| Directory | Responsibility |
| --- | --- |
| `app/` | Pages, API routes and metadata |
| `components/scently/` | Interactive product components |
| `lib/domain.ts` | Branding, types and validation |
| `lib/discovery.ts` | Replaceable search, scoring, offer rules |
| `lib/server/` | Data access, authorization and integrations |
| `data/catalog.ts` | Six sourced starter fragrances |
| `db/`, `drizzle/` | Schema, constraints, indexes and migrations |
| `tests/` | Unit, SQLite integration and browser tests |

The initial catalog is intentionally small. Search currently operates in memory behind a separable function; move retrieval and aggregates to database search before large imports. This release does not implement PostgreSQL trigram search or claim a comprehensive licensed database.

## Setup

Requirements: Node **24 LTS**, npm, Git; on Windows, the Microsoft Visual C++ x64 runtime for workerd.

```sh
npm ci
# PowerShell: Copy-Item .env.example .env.local
cp .env.example .env.local
npm run db:migrate:local
npm run dev
```

Open the printed loopback URL, normally `http://127.0.0.1:5173`. In another terminal, run `npm run db:seed:local`. Seeding also runs on the first catalog request, inserts only missing starter records and preserves edited data. No reviews, prices or performance values are fabricated. Local state lives in ignored `.wrangler/state`.

The portable dev plugin simulates sign-in on loopback only. Visit `/signin-with-chatgpt?return_to=/account` as `local_seedy`. To test the admin UI, set `ADMIN_USER_IDS=local_seedy` and restart. Leave that empty for the default non-admin browser test. Production builds do not include simulated sign-in.

Windows `write EOF` with workerd exit `0xC0000135` indicates missing native runtime DLLs. Check [Microsoft's supported Visual C++ downloads](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist). The original framework notes are retained in [starter-reference.md](docs/starter-reference.md).

## Configuration

Copy `.env.example` locally; configure secrets through Sites runtime settings in production.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-only secret |
| `OPENAI_MODEL` | Available model supporting strict function calling |
| `ADMIN_USER_IDS` | Site-specific IDs; empty denies admin access |
| `CONTACT_EMAIL` | Actual operator address; otherwise unavailable |

Both OpenAI settings enable AI interpretation. Missing credentials, timeout or invalid output use an explicit rule-based fallback. Live provider calls have not been verified without credentials. `/api/me` returns the signed-in site-specific ID for administrator setup; do not substitute an unrelated account ID.

Identity headers must originate from trusted Sites dispatch. A standalone host must add real authentication and strip caller-supplied identity headers. Email/password, verification, password reset and Google OAuth are **not configured**. The UI does not simulate them.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Playwright uses installed Chrome and a running local dev server. `E2E_BASE_URL` may target another isolated development instance. Tests create then remove a test review and shelf item; never run them against production. SQLite integration tests use an in-memory database to check ownership, votes, moderation and admin updates. Automated accessibility checks and keyboard tests do not replace a full manual accessibility audit.

## Integrations and data

See [integration notes](docs/integrations.md) and [data rules](docs/data-rules.md). No OpenAI key, licensed catalog subscription, retailer credentials or affiliate approvals were supplied. There are **no live retailer feeds**. Administrators can manage legitimately verified listings. `RetailerAdapter` defines the authorized-feed interface.

JSON imports contain an array of fragrance-schema objects. CSV uses the same field names; `notes`, `accords`, `editorialSeasons` and `occasions` cells contain JSON with normal CSV quoting. Include source attribution and verification time. Validate, review errors, then import. Imports never overwrite existing records; explicit reviewed edits do. Imports are limited to 100 records / 110 KB, applied record by record. After infrastructure failure, revalidate remaining records before retrying.

## Deployment

Reuse the project ID in `.openai/hosting.json` and its `DB` D1 binding. Sites provisions the database and applies committed Drizzle migrations before Worker publication; local and hosted databases are separate.

1. Configure runtime secrets, administrator IDs and real contact information.
2. Validate, then build through the Sites `build-site.mjs` helper.
3. Use its source workflow to push the exact commit and package the matching build.
4. Save and deploy that version while preserving the private audience.
5. Verify real authenticated flows after deployment.

Never commit credentials, local state or test artifacts. Append migrations instead of changing applied history. Update `brandConfig.origin` if the assigned origin changes. There is no checkout/payment processing.

## Remaining operational limits

- Six sourced starter fragrances; expand only with verified, legitimately usable data.
- Rule-based parsing is deliberately limited; unsupported wording may need reformulation.
- AI usage logs tokens; dollar costs require actual provider billing rates.
- Anonymous finder requests share a rate-limit bucket; add per-session edge limits for larger traffic.
- Configure contact and review the informational privacy/terms pages for the actual launch context.
- Private Sites are not publicly indexable.
