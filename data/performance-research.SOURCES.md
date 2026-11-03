# Performance research, 3 November 2026

Source: [10ML Fragrance Index](https://mcp.10ml.com/), using its public [REST API](https://mcp.10ml.com/openapi.json) and [terms](https://mcp.10ml.com/terms). Attribution requested by the publisher is “10ML Fragrance Index”.

All 6,018 published profiles were checked through the documented cursor pagination, at approximately one request per second. The source supplies longevity and projection scores for 481 full editorial profiles. This cached extract contains only identity, factual numeric scores, retrieval date and per-profile source links; it does not reproduce descriptions, articles, recommendations, photographs or community reviews. No image license is inferred.

The publisher defines longevity as a 1 (short) to 5 (very long) scale, and projection as a 1 (skin scent) to 5 (fills a room) scale. Display labels summarize that scale. Scores are editorial assessments, not measured hours, projection distances, Scently votes or laboratory results.

Matching uses house, edition name and concentration, including the catalog's reviewed house and collection aliases. Distinct concentrations are not treated as interchangeable. At this snapshot, 288 of the 1,467 unique shipped editions have a matching score. The remaining 1,179 have no matching score from this index; this includes different-concentration conflicts and absent profiles, and does not assert that performance is unknowable. Source product pages may separately provide attributed longevity and sillage categories when a visitor opens a profile. Sillage is identified as scent trail, not a measured projection distance. Supplier review totals and imported ratings are excluded.

Run `npx tsx scripts/audit-performance.ts` to generate the per-edition coverage report. These scores are a dated research snapshot; they are not automatically refreshed and future arrivals can remain without an assessment.
