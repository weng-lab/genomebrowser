# Browser-backed runtime features use focused providers

Status: deprecated by ADR-0014

v2 no longer exposes browser-backed track capabilities through a single generic module runtime context. Panning state, browser SVG coordinate access, track-height updates, and tooltips are backed by focused providers and hooks, while `BrowserFeatureProviders` only composes those providers for `GenomeBrowser`; this keeps browser-backed module APIs narrow and avoids turning runtime context into a grab bag of unrelated browser state.
