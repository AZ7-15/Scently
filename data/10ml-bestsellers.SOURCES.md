# Popularity ranking snapshot

Retrieved 3 November 2026 from [10ML's Most Popular Perfumes and Bestsellers](https://10ml.com/best-sellers). The source says its list is ordered by products 10ML customers order most, and the page identifies a date-sensitive list of about 200 items. The bundled snapshot contains 187 products whose house could be matched to the catalog; 12 unmatchable titles were omitted. It stores product names, houses and order positions only, without product photos, descriptions, reviews or ratings.

This is one retailer's sales signal, not a worldwide sales chart. Scently combines the two sources as equally weighted rank percentiles: the 10ML position within its 199-item list and the Scento dataset's `popularity_rank` (where 1 means best known, within the 1,200-position scale used by its snapshot). The Scento field is described by the [Scento Perfume Database](https://huggingface.co/datasets/scento/perfume-database). An item with only one source uses that available signal. Fragrances without an unambiguous matching rank remain unranked and follow after ranked fragrances in the existing catalog order. Concentration-specific records are not assigned another concentration's rank.

The snapshot is not automatically refreshed. Check the source page before replacing it; match by house, edition and concentration where the source supplies one.
