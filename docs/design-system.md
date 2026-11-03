# Scently design consistency

All individual fragrance routes render the same FragranceStory component. The /discover/[lookup] route adapts provider data; /fragrances/[slug] adapts saved catalog records. The shared template owns the bottle portrait, metadata, accord links, composition navigation, illustrated pyramid, season cards and source details. Saved records add their real collection, comparison, reviews and price features through slots. Do not create a separate per-brand or per-record detail layout.

The landing page uses the same ProductPhoto and NotePortrait components, sourced bottle imagery, serif headings, forest-green actions and warm surfaces. Its featured products combine sourced starter records and the current provider page, with a local fallback when the provider is unavailable. Editorial selections are not popularity rankings.

Shared card, panel and control radii are CSS variables in app/globals.css. Family colours add variation within one palette. Product cards, forms, empty states and buttons share these tokens across browsing and account flows. Fragrance facts, image availability and source attribution remain data-dependent; consistency must not invent missing content or controls.

The browser suite checks the landing-to-detail journey, every saved fragrance through the shared layout, external profiles, image loading, navigation and mobile overflow.
