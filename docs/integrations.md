# Integration status

## OpenAI

The server uses [Responses API structured function calling](https://developers.openai.com/api/docs/guides/function-calling) to interpret preferences. Output is revalidated using Zod. The model cannot supply products, prices, ratings, SQL or executable code. Retrieval and explanations use application records and deterministic evidence statements. This avoids a second model call that could embellish product facts. Timeout: 15 seconds. Prompt limit: 1,500 characters. Rate limits persist in D1. Requests set `store:false`; usage logs contain model and token counts, not messages.

## Retailers

Research checked October 30, 2026. These are integration leads, not approvals or unrestricted APIs.

- [FragranceNet](https://www.fragrancenet.com/help/affiliate_program): official partner program directs publishers to Rakuten. Confirm approval and permitted data access separately.
- [Jomashop](https://help.jomashop.com/hc/en-us/articles/11923106976027-Affiliate-Program): official program uses Commission Junction and mentions a product feed. Obtain approval and feed terms.
- [FragranceBuy](https://fragrancebuy.ca/pages/collab): a partnership application exists; no unrestricted price API was established.
- FragranceX: no authorized feed contract established in this work. Keep the adapter unconfigured pending documented access.

Implement `RetailerAdapter.fetchAuthorizedOffers()` against approved feeds only. Validate normalized records with `offerSchema`; retain source, region, currency, concentration, size, packaging, condition and verification time. Unknown shipping/tax stays null. Affiliate approval does not automatically permit scraping or image reuse.

## Authentication and assets

Sites supplies ChatGPT identity and D1 persistence. A standalone deployment needs replacement authentication/storage adapters. Do not rely on client-supplied roles or simulate production accounts.

Manufacturer facts were manually checked, each record links to its source, and descriptions are original summaries. Public accessibility does not grant commercial reuse rights. Product images are labeled CSS illustrations unless an administrator supplies a licensed URL. The inherited hero artwork is decorative, not an actual product photo; review its provenance before redistribution outside this project.
