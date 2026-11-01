# Integrations

Render hosts standard Next.js/Node. Production storage uses external Turso **libSQL** through `@libsql/client/web`; local development uses Node SQLite. Parameterized adapters preserve the existing Drizzle queries. Transactional migrations record checksums.

Email/password registration and login use scrypt password hashes, random session tokens stored as SHA-256 hashes, HTTP-only SameSite cookies, expiry, rate limits and same-origin mutation checks. `ADMIN_USER_IDS` controls admin access. Caller-provided ChatGPT identity headers are ignored. Google OAuth, email verification and email-based recovery are not configured.

OpenAI Responses strict function calling interprets preferences only when both `OPENAI_API_KEY` and `OPENAI_MODEL` are set. Catalog retrieval and ranking remain deterministic. Failure or missing credentials produces a labeled rule-based fallback. Requests disable response storage. Usage logs store model/token counts, not messages. Live provider calls remain unverified without credentials.

No retailer feeds or affiliate partnerships are connected. `RetailerAdapter.fetchAuthorizedOffers()` defines the feed interface. Offers retain region, currency, concentration, size, packaging, condition, source, verification time and shipping/tax disclosures. Offers expire after 48 hours.

Starter photos come from manufacturer product pages. Exact image URLs, source pages and dates are recorded in `data/photo-sources.json`. Bundled local files avoid runtime hotlink dependence. Attribution does not represent commercial licensing or a brand partnership. No Fragrantica photographs or copied reviews are included. A complete Fragrantica catalog has not been imported.

`render.yaml` specifies a free web service without a paid disk. Deployment requires a connected source repository and external database secrets. Previous Sites/D1 data is independent and is not migrated automatically. Creating the Blueprint file does not deploy a service.
