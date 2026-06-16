# Browser, tracks, and the module system have explicit boundaries

v2 keeps the track module system in `src/modules`, the `GenomeBrowser` implementation in `src/browser`, and first-party track implementations in `src/tracks`. Both the browser and built-in tracks depend on the module system, but tracks do not import browser implementation details; browser-backed helpers needed by track modules live behind the narrow `src/modules/runtime` seam so module authors can consume them without coupling to browser internals.
