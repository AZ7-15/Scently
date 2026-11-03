# Catalog accuracy audit - 2026-11-02

The validation policy applies to every brand. It is not a claim that all provider records have been independently verified.

## Findings and fixes

- The live provider returned Parfums de Marly suggestions for a Bleu de Chanel search. Unified search now re-filters hydrated records against the actual query, keeping unrelated suggestions out of the results.
- Photo matching previously removed concentration labels before comparison. Known EDT, EDP, Parfum, Extrait, Cologne and Elixir values now require explicit matching photo-source evidence. Missing or conflicting evidence yields no photo.
- External profile links preserve expected name, brand and concentration. A fuzzy lookup returning another product is withheld.
- Concentration is part of the photo cache key. Flankers and brands remain distinct. Abbreviations such as EDP are normalized without merging EDT and EDP.
- Spaced model numbers such as 9 PM match a 9PM query. Names in non-Latin scripts are preserved in identity comparisons.

## Verification scope

Parameterized tests exercise Dior Sauvage, Chanel Bleu de Chanel, Xerjoff Naxos, Parfums de Marly Layton, Nautica Voyage, Afnan 9PM, Armaf Club de Nuit Intense Man and Rasasi Hawas. These are synthetic matching fixtures, not independent factual audits of those eight products.

Live catalog requests checked Dior Sauvage, Bleu de Chanel, Xerjoff Naxos and Afnan 9PM. Missing source coverage is not replaced with invented records. The Naxos and Layton note stages returned by the provider were compared with their official manufacturer pages and were consistent, allowing wording differences such as Cashmere versus Cashmere Wood.

- [Xerjoff Naxos official product page](https://www.xerjoff.com/en-ae/products/naxos-eau-de-parfum)
- [Parfums de Marly Layton official product page](https://us.parfums-de-marly.com/products/layton)

This is a bounded spot check. Other provider facts, aliases, reformulations and missing photographs remain unverified. Manufacturer pages and packaging can change; source attribution and retrieval dates are retained. No whole-catalog crawl was performed.


## Unified browsing follow-up

The original filters only narrowed loaded records. The new browse adapter queries the supplier's public storefront listing across its catalog and forwards house, material and family constraints before following pages. Live checks returned 1,475 catalog records, 166 Floral candidates, 44 Lattafa records, and 16 Dior records for Rose. These are candidate totals from the supplier; the combined criteria are checked again per page. The directory contains 152 entries representing 151 normalized house names, including one accent alias.

Browser verification confirmed multiple brands in the Floral result grid and preserved filters on subsequent pages. Catalog records use their own supplier thumbnails, avoiding a second fuzzy photo lookup when a pack shot is provided. This expands coverage; it does not establish universal completeness or independently verify every source fact.
