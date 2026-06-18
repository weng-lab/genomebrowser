# Fetch functions return raw region data

v2 track module `fetch` functions return raw data for the requested genomic region and must not shape that data for a specific render width or display mode. Renderers are responsible for transforming raw data into display-specific shapes such as pixel-condensed BigWig points. This keeps fetched data directly tied to genomic intervals, which allows the browser data store to cache and compose overlapping regions without coupling cache validity to rendering details.
