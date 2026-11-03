# Integrations

## Free live fragrance source

Live search and profiles call Scento's public REST API at `https://www.scento.com/api/perfume/v1/`. It requires no key. Search accepts a fragrance or brand and returns the source's continuation cursor; profiles return the available composition and metadata with source links. Search results are not an exhaustive global catalog. Brand suggestions are starting points rather than coverage guarantees. No API product images, community reviews, performance measurements or verified prices are invented.

The adapter validates responses, uses a bounded 128-answer cache for 15 minutes, coalesces concurrent requests and limits upstream calls to 60 per minute per process. It does not crawl or persist a copy of the source catalog. This follows the [API reference](https://www.scento.com/developers/perfume-api) and [API-specific terms](https://www.scento.com/terms-of-service#perfume-api). The provider can change availability or coverage.

`/api/catalog?q=Lattafa` combines local records and one provider page, hydrating available composition and season data for common filters. Matching brand/name/concentration records keep the local version and its reviews. Distinct concentrations are preserved. Pagination uses the provider cursor. Legacy `/api/discovery/search` and `/api/discovery/fragrance` routes remain available.

## Product photographs

Bundled manufacturer photos are used where available. `/api/catalog/photo` looks up a product-specific photograph from Scento's public product metadata or an exact bottle label on a brand page. Public Shopify product-search fallbacks use Fragrance Lord, DecantX and Scent Decant. Names and brands must match; another flanker and generic brand cover are rejected. Only configured HTTPS image hosts are accepted, and arbitrary source URLs are never fetched. Matching source URLs are retained for credit. Metadata is cached, upstream requests are limited, and photos load near the viewport. Failed images try another matched candidate. A missing image is clearly marked rather than replaced with an inaccurate bottle. Third-party availability and image rights remain subject to their respective owners.

Lattafa India also supplies an exact-name public product-metadata fallback for Lattafa records that lack a photo in the other sources.

## Database setup mode

Without both Turso secrets on Render, the app serves browse-only pages and live lookups. Account mutations return 503 and the health endpoint explicitly reports the missing configuration. It never silently writes user data to an ephemeral filesystem. Both configured but invalid credentials still fail database health checks. Add the database URL/token under Render's Environment settings and redeploy to enable persistence.

Render hosts standard Next.js/Node. Production storage uses external Turso **libSQL** through `@libsql/client/web`; local development uses Node SQLite. Parameterized adapters preserve the existing Drizzle queries. Transactional migrations record checksums.

Email/password registration and login use scrypt password hashes, random session tokens stored as SHA-256 hashes, HTTP-only SameSite cookies, expiry, rate limits and same-origin mutation checks. `ADMIN_USER_IDS` controls admin access. Caller-provided ChatGPT identity headers are ignored. Google OAuth, email verification and email-based recovery are not configured.

OpenAI Responses strict function calling interprets preferences only when both `OPENAI_API_KEY` and `OPENAI_MODEL` are set. Catalog retrieval and ranking remain deterministic. Failure or missing credentials produces a labeled rule-based fallback. Requests disable response storage. Usage logs store model/token counts, not messages. Live provider calls remain unverified without credentials.

No retailer feeds or affiliate partnerships are connected. `RetailerAdapter.fetchAuthorizedOffers()` defines the feed interface. Offers retain region, currency, concentration, size, packaging, condition, source, verification time and shipping/tax disclosures. Offers expire after 48 hours.

Starter photos come from manufacturer product pages. Exact image URLs, source pages and dates are recorded in `data/photo-sources.json`. Bundled local files avoid runtime hotlink dependence. Attribution does not represent commercial licensing or a brand partnership. No Fragrantica photographs or copied reviews are included. A complete Fragrantica catalog has not been imported.

`render.yaml` specifies a free web service without a paid disk. Deployment requires a connected source repository and external database secrets. Previous Sites/D1 data is independent and is not migrated automatically. Creating the Blueprint file does not deploy a service.


## Unified catalog browsing and filters

The catalog page now browses the supplier's public storefront listing at /api/products, one 12-record page per user request. This currently reports 1,475 records. /brands supplies 151 distinct house names after combining duplicate accent aliases; /api/notes supplies the common material identifiers. These are runtime observations, not fixed catalog totals.

Brand identifiers, material identifiers and accord/family filters are forwarded to the listing before pagination. Other selected criteria are checked against each returned page, with unknown data excluded. The same criteria are preserved in the URL and continuation requests. Text searches continue to use the public Perfume API. Local records and reviews are merged by identity with both paths.

The source listing and directory formats are public storefront interfaces, not the documented Perfume API contract; they can change. Responses are validated, request-coalesced, cached briefly in bounded memory and rate limited. There is no background crawl, persisted supplier catalog or full-catalog mirror. Failure leaves sourced local records available with an explicit notice. Candidate counts belong to the source and may exceed the matches shown after all local criteria.

Supplier thumbnails are accepted only as HTTPS pack shots on the configured image CDN. Campaign art is excluded. Supplier metadata such as Fragrantica ratings or vote counts is deliberately not turned into Scently reviews or measured performance. Season categories are source guidance, not community votes. Actual source facts still need independent verification when a discrepancy is reported.


## Fragrance stories and note portraits

Individual source profiles now read the matching public product page to obtain its full disclosed note stages, description and pack shot. The Perfume API can return only a few signature materials. Product name and house must match before enrichment; malformed or unavailable pages retain the original profile. Only configured HTTPS product-image hosts are accepted, and campaign artwork is excluded. No supplier community ratings or performance votes are imported.

The shared illustrated pyramid is also used on the six community detail pages. Every note links to the combined catalog filter. Descriptions explain general material/accord character and are editorial, rather than additional product ingredients. /api/notes/portrait resolves the specific note portrait from Scento's public note page; it rejects recommended-product pictures, different note names and external hosts. Note images load near the viewport. Missing imagery retains a labelled note with a neutral leaf marker.

Source pages are fetched on demand with coalescing, short bounded caching, timeouts and rate limits. No complete catalog or note-image library is copied. Imagery remains credited to Scento and its respective rights holders. Illustrated notes can represent accords recreated with aroma materials; the images do not assert that the depicted raw ingredient was physically used in a bottle.
