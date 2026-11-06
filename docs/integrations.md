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

Gemini structured JSON output interprets finder preferences and Google Search grounding researches supported candidates when `GEMINI_API_KEY` is set. `GEMINI_MODEL` defaults to `gemini-3.8-flash`. The API key is read server-side and sent only in the `x-goog-api-key` request header. Grounded research favors Fragrantica and vetted official brand domains; only candidate IDs already returned from Scently's catalog may become results. Citations are filtered to those source domains and displayed with supported matches. The fragrance performance panel also uses Gemini grounding to look for explicit longevity and projection-duration hour reports on the exact Fragrantica edition. It does not convert qualitative votes or infer hours; unsupported values remain unavailable. Results link to the matched source and are cached in process memory for seven days. Missing credentials, unavailable search grounding, or provider errors leave performance hours unavailable. Grounded search shares a 1,000-request monthly cap with the finder; Google Search grounding has separate quota and billing. See [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). Usage logs store model/token counts, not prompts.

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

## Catalog-wide finder, suggestions and comparisons

The finder now interprets preferences using the source note directory and house names, then queries source candidates before deterministic ranking. Material, house, style and niche constraints are sent upstream when supported; rarer materials use the public Perfume API search. Candidate records are merged with saved records to preserve real community evidence. Niche classifications come from the source directory rather than a hardcoded list of three houses.

Every response reports the source candidate total, records assessed in the current page, and a continuation. More recommendations preserves criteria and omits already shown record IDs; it does not rerun the model for the same page sequence. This is source-wide query retrieval with paginated ranking, not a claim that every catalog record was individually scored in one response. No background crawl or complete supplier mirror is created. Source failure is surfaced rather than silently reverting to starter-only suggestions. AI interpretation remains optional and transparently labelled.

Landing autocomplete and the comparison picker call /api/catalog rather than filtering the starter array. External comparison records are retained only in the visitor's browser, capped at the three selected records. This does not create source reviews, save supplier records to a database, or invent price/performance statistics. Personal shelf filters and review selectors remain scoped to the visitor's actual saved records and published reviews.

## Licensed published index and new arrivals

The additional Scento Open Dataset is a publisher-provided export under CC BY 4.0, separate from the live API's no-crawl workflow. The bundled 2026-10-29 edition contains 1,479 rows across 160 source house names, including 189 Armaf and 53 Afnan rows. Provenance and licensing are recorded beside the data. Records are normalized for the shared domain with explicit publisher attribution; missing photos, measurements, prices, dates and note stages remain unknown.

The server validates and checks the published JSONL and license descriptor at most daily, coalesces refreshes, bounds response size and falls back to the shipped copy on failure. It does not scrape the supplier's complete storefront. New source versions supply their own publication date. No image reuse license is inferred from the data license.

Unified browsing and text search merge the full matching published index with saved records and the current live page, preserving known concentration variants. The finder ranks matching index candidates as well as live candidates; after live pages end, a bounded index continuation can retrieve additional unseen recommendations. Source and indexed candidate counts are disclosed separately. Open-index profiles resolve by their own identifiers, without substituting a fuzzy API result for another flanker.

New arrivals forwards sort_by=new-releases and new_releases_only=true to the live storefront, with existing brand and note criteria. The published snapshot and old starter records are excluded from this mode so they cannot masquerade as arrivals. A newly stocked older fragrance is explicitly distinguished from a newly launched perfume. Live source caching remains short; this is not a worldwide launch feed or a guarantee of complete house coverage.
