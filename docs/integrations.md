# Integrations

## Free live fragrance source

Live search and profiles call Scento's public REST API at `https://www.scento.com/api/perfume/v1/`. It requires no key. Search accepts a fragrance or brand and returns the source's continuation cursor; profiles return the available composition and metadata with source links. Search results are not an exhaustive global catalog. Brand suggestions are starting points rather than coverage guarantees. No API product images, community reviews, performance measurements or verified prices are invented.

The adapter validates responses, uses a bounded 128-answer cache for 15 minutes, coalesces concurrent requests and limits upstream calls to 60 per minute per process. It does not crawl or persist a copy of the source catalog. This follows the [API reference](https://www.scento.com/developers/perfume-api) and [API-specific terms](https://www.scento.com/terms-of-service#perfume-api). The provider can change availability or coverage.

Read-only application routes: `/api/discovery/search?q=Lattafa` and `/api/discovery/fragrance/khamrah-lattafa`. Community filters and the finder continue to use the separately maintained local catalog.

## Database setup mode

Without both Turso secrets on Render, the app serves browse-only pages and live lookups. Account mutations return 503 and the health endpoint explicitly reports the missing configuration. It never silently writes user data to an ephemeral filesystem. Both configured but invalid credentials still fail database health checks. Add the database URL/token under Render's Environment settings and redeploy to enable persistence.

Render hosts standard Next.js/Node. Production storage uses external Turso **libSQL** through `@libsql/client/web`; local development uses Node SQLite. Parameterized adapters preserve the existing Drizzle queries. Transactional migrations record checksums.

Email/password registration and login use scrypt password hashes, random session tokens stored as SHA-256 hashes, HTTP-only SameSite cookies, expiry, rate limits and same-origin mutation checks. `ADMIN_USER_IDS` controls admin access. Caller-provided ChatGPT identity headers are ignored. Google OAuth, email verification and email-based recovery are not configured.

OpenAI Responses strict function calling interprets preferences only when both `OPENAI_API_KEY` and `OPENAI_MODEL` are set. Catalog retrieval and ranking remain deterministic. Failure or missing credentials produces a labeled rule-based fallback. Requests disable response storage. Usage logs store model/token counts, not messages. Live provider calls remain unverified without credentials.

No retailer feeds or affiliate partnerships are connected. `RetailerAdapter.fetchAuthorizedOffers()` defines the feed interface. Offers retain region, currency, concentration, size, packaging, condition, source, verification time and shipping/tax disclosures. Offers expire after 48 hours.

Starter photos come from manufacturer product pages. Exact image URLs, source pages and dates are recorded in `data/photo-sources.json`. Bundled local files avoid runtime hotlink dependence. Attribution does not represent commercial licensing or a brand partnership. No Fragrantica photographs or copied reviews are included. A complete Fragrantica catalog has not been imported.

`render.yaml` specifies a free web service without a paid disk. Deployment requires a connected source repository and external database secrets. Previous Sites/D1 data is independent and is not migrated automatically. Creating the Blueprint file does not deploy a service.
