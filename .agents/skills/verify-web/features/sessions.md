# Sessions

Sessions lets a signed-in user create a named genome browser session for an assembly, open and switch between saved sessions, rename the open session inline, copy a session, search saved sessions, and delete sessions with persistence across reloads.

## Sub-features

- `sessions-create-switcher` creates a session from the browser title bar's session switcher menu and opens it at `/browser/<id>`.
- `sessions-create-page` creates a session from the `/sessions` page and navigates to `/browser/<id>`.
- `sessions-rename` renames the open session inline from its title button and persists the change.
- `sessions-search` filters saved sessions by name or assembly on `/sessions` and shows an empty state for non-matching queries.
- `sessions-copy` duplicates an existing session from its row actions menu as `Copy of <name>`.
- `sessions-delete` removes a session from its row actions menu and updates both the browser and `/sessions`.

## How to get to it (user POV)

- Click the `Sessions` chevron button next to the page title on `/browser`, then choose `New session`, a recent session row, or `All sessions`.
- Click `Sessions` in the left navigation rail (or visit `/sessions`) to search all saved sessions, open one, or click `New session`.
- Click the open session's name in the `/browser` title bar to rename it inline (`Enter` saves, `Escape` cancels).
- Open `Actions for session <name>` on any session row in the switcher or on `/sessions` to `Save a copy` or `Delete`.

## Driving it with verify-web

Preconditions:

- `@weng-lab/web` is launched and `verify-web.mjs doctor` reports `healthy: true` with `mode: "signed-in"`.
- The browser is at `/browser`.

- **Open switcher and create session.** Click the `Sessions` chevron button and choose `New session`. Run `verify-web.mjs browser find role button click --name "Sessions" --exact`, `verify-web.mjs browser find text "New session" click`, `verify-web.mjs browser find role textbox fill --name "Name" "Verify Smoke Session"`, and `verify-web.mjs browser find role button click --name "Create"`. Wait for `All changes saved` (`verify-web.mjs browser wait --text "All changes saved"`) and track loading (`verify-web.mjs browser wait --fn "!document.querySelector('[role=\"progressbar\"], svg animateTransform[type=\"rotate\"]')"`). The URL changes to `/browser/<id>`, the heading button reads `Verify Smoke Session`, and the starter `hg38` tracks (`Coordinates`, `GENCODE 50 basic`, `Human cCREs`) render.
- **Rename inline.** Click the session title button and save a new name. Run `verify-web.mjs browser find role button click --name "Verify Smoke Session" --exact`, `verify-web.mjs browser find role textbox fill --name "Session name" "Verify Renamed Session"`, and `verify-web.mjs browser press Enter`. Wait for `All changes saved` (`verify-web.mjs browser wait --text "All changes saved"`). Both the title button and the `Current Session` card in the left panel read `Verify Renamed Session`.
- **Confirm persistence on `/sessions` and search.** Navigate via the sidebar link `Sessions`. Run `verify-web.mjs browser find role link click --name "Sessions" --exact`, then `verify-web.mjs browser wait --text "Verify Renamed Session"`. Filter with a match: `verify-web.mjs browser find placeholder "Search sessions" fill "Renamed"` — `Verify Renamed Session` remains visible. Filter with a miss: `verify-web.mjs browser find placeholder "Search sessions" fill "zzzz-no-match"` — `No sessions match` appears. Clear the search box (`verify-web.mjs browser find placeholder "Search sessions" fill ""`).
- **Confirm persistence across reload.** Reload the page (`verify-web.mjs browser reload`) and wait for `Verify Renamed Session` (`verify-web.mjs browser wait --text "Verify Renamed Session"`). Confirm the renamed session is still listed.
- **Copy and delete sessions.** Open the row menu (`verify-web.mjs browser find role button click --name "Actions for session Verify Renamed Session" --exact`) and click `Save a copy` (`verify-web.mjs browser find role menuitem click --name "Save a copy"`). Wait for `Copy of Verify Renamed Session` (`verify-web.mjs browser wait --text "Copy of Verify Renamed Session"`). Delete the copy: `verify-web.mjs browser find role button click --name "Actions for session Copy of Verify Renamed Session" --exact` and `verify-web.mjs browser find role menuitem click --name "Delete"`. Wait for it to disappear (`verify-web.mjs browser wait --fn "!document.body.innerText.includes('Copy of Verify Renamed Session')"`), then delete the original (`verify-web.mjs browser find role button click --name "Actions for session Verify Renamed Session" --exact` and `verify-web.mjs browser find role menuitem click --name "Delete"`). Wait until `No saved sessions yet.` appears (when no other sessions exist).
- **Proof.** Capture screenshots and ARIA snapshots after creating the session, on `/sessions`, and after deletion: `verify-web.mjs screenshot sessions/browser-open`, `verify-web.mjs snapshot sessions/browser-open`, `verify-web.mjs screenshot sessions/list-view`, and `verify-web.mjs screenshot sessions/empty-after-delete`. Confirm `verify-web.mjs browser errors` prints no errors.

## Gotchas

- `Sessions` in the left navigation rail is a `link`, whereas the switcher chevron next to the session title on `/browser` is a `button` also named `Sessions`. Always specify `role link` vs `role button`.
- Standard buttons like `Create` and `New session` expose uppercase labels (and a leading space when they have a leading icon), so omit `--exact` when matching them.
- While a copy or delete is in flight, all session row action buttons are temporarily disabled. Wait for the previous deletion to disappear from the list before clicking the next row's actions button.
- The rename field selects all text on focus and saves on blur or `Enter`; pressing `Enter` with an empty value keeps the field open with a validation prompt.
- Always wait for `All changes saved` before reloading or navigating away to assert persistence.
