# Dynseq browser tests

Run `pnpm tracks test:e2e` with `agent-browser` and its Chromium installation available.
The runner starts an isolated Vite server and browser session and closes both afterward.
It does not use the playground or external data services.

The fixture page mounts the real dynseq and BigWig modules in separate `GenomeBrowser`
instances sharing a browser store. Controls drive the public store APIs. The server
serves the reader package's BigWig fixture and a generated 2bit over HTTP range requests.

Assertions cover identical signal SVG, zoom and responsive resize transitions, letter
threshold edits, sparse glyph widths, negative-score tooltips, dense display, shared
settings, and absence of reference requests in signal-only views. Run this check separately
from `pnpm verify`, which does not provision Chromium or the agent-browser CLI.
