# Browser navigation and image export

Browser navigation and image export lets a user move across the genome with coordinate search and pan/zoom controls, reorder tracks by metadata or title with `Sort tracks`, and export the current browser view as SVG or PNG via `Download`.

## Sub-features

- `nav-pan-zoom` pans left/right and zooms in/out using the toolbar controls and updates the displayed coordinates and span.
- `nav-region-search` opens the coordinate search field, navigates to entered `chr:start-end` coordinates, and persists the region to the session.
- `nav-copy-region` copies the current region coordinates and shows the confirmation snackbar.
- `tracks-sort` opens `Sort Tracks`, adds a sort criterion, applies order, and keeps pinned tracks (`Coordinates`) at the top.
- `image-download` opens `Download image`, chooses SVG or PNG options, and downloads an exported image once tracks finish loading.

## How to get to it (user POV)

- Open any session at `/browser/<id>` so the `ControlToolbar` and `GenomeBrowser` render.
- Use `Pan left`, `Pan right`, `Pan magnitude`, `Zoom out`, `Zoom in`, and `Zoom magnitude` in the `Navigate` group.
- Click the displayed region coordinates button (`Edit region <chr:start-end>`) to type new coordinates, or click `Copy current region`.
- Click `Sort tracks` or `Download` in the toolbar's management actions.

## Driving it with verify-web

Preconditions:

- `@weng-lab/web` is healthy (`verify-web.mjs doctor` passes) and a fresh `hg38` session is open at `/browser/<id>` (default view `chr12:53,372,923-53,423,700` with `Coordinates`, `GENCODE 50 basic`, and `Human cCREs`).
- Wait for initial track loading to settle: `verify-web.mjs browser wait --fn "!document.querySelector('[role=\"progressbar\"], svg animateTransform[type=\"rotate\"]')"`.

- **Zoom in and pan right.** Record the starting region button label with `verify-web.mjs browser snapshot -i`. Run `verify-web.mjs browser find role button click --name "Zoom in" --exact` and confirm the displayed span shrinks by roughly 3× (from `50,778 bp` to `16,926 bp`). Then run `verify-web.mjs browser find role button click --name "Pan right" --exact` and confirm the displayed start and end coordinates shift right. Wait for `All changes saved`.
- **Jump by coordinate search.** Click the region button (`Edit region ...`), enter a coordinate range, and submit. Run `verify-web.mjs browser snapshot -i` to grab the `Edit region ...` button ref, click it, fill the `Region, gene, SNP or cCRE` search field with `chr12:53380000-53410000`, and click `Go to search result` (`verify-web.mjs browser find role button click --name "Go to search result" --exact`) or press `Enter`. Confirm the displayed region updates to `chr12:53,380,000-53,410,000` and wait for `All changes saved`.
- **Confirm region persistence.** Reload (`verify-web.mjs browser reload`) and wait for tracks to settle (`verify-web.mjs browser wait --fn "!document.querySelector('[role=\"progressbar\"], svg animateTransform[type=\"rotate\"]')"`). Confirm the toolbar still shows the navigated `chr12` region rather than reverting to the default starter coordinates.
- **Sort tracks.** Click `Sort tracks`: `verify-web.mjs browser find role button click --name "Sort tracks"`. Confirm the `Sort Tracks` dialog opens with `Apply order` initially disabled. Choose a sort option (for example, `Title`) in the option picker, confirm `Apply order` becomes enabled, and click `verify-web.mjs browser find role button click --name "Apply order"`. Confirm the dialog closes and the pinned `Coordinates` ruler remains first.
- **Download image.** Wait until no track loading spinner is present, then run `verify-web.mjs browser find role button click --name "Download"`. Confirm the `Download image` dialog opens with `SVG` selected by default and `Download SVG` enabled. Switch to PNG (`verify-web.mjs browser find role radio click --name "PNG"`), confirm the `Resolution` radio group (`1×`, `2×`, `3×`) appears and the button reads `Download PNG`, then trigger a download into the evidence directory (`verify-web.mjs browser download 'button:has-text("Download PNG")' /tmp/gb-verify-evidence/<runId>/browser/exported.png`) or switch back to SVG and download `.svg`. Confirm the downloaded file is non-empty and the dialog closes.
- **Proof.** Capture before/after navigation screenshots and a snapshot: `verify-web.mjs screenshot browser/after-nav`, `verify-web.mjs snapshot browser/after-nav`, and verify `verify-web.mjs browser errors` is empty.

## Gotchas

- `Download SVG` / `Download PNG` stays disabled with `Waiting for tracks to finish loading…` while tracks are still loading. Always wait for `!document.querySelector('[role="progressbar"], svg animateTransform[type="rotate"]')` first.
- Coordinate search currently accepts coordinate ranges (such as `chr12:53380000-53410000`); gene/SNP/cCRE lookup is not enabled in the web app yet.
- Default starter tracks fetch data from `users.wenglab.org` and `downloads.wenglab.org`. If external network access is blocked, track loading may fail; report that precondition instead of marking track rendering verified.
- `Copy current region` may show the fallback notice (`Could not copy...`) in headless browser contexts without clipboard permissions.
