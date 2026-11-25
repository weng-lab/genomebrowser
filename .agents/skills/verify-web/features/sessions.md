# Sessions

Sessions lets a signed-in user create a named genome browser session for an assembly, open and switch between saved sessions, rename the open session inline, copy a session, search saved sessions, and delete one session or all of them, with persistence across reloads. Saved sessions are listed in the browser's **Sessions** left panel, which shares the left side with the **Genome Browser** panel; there is no separate sessions page.

## Sub-features

- `sessions-panel-toggle` shows the Sessions left panel from the side bar's `Sessions` button, hides the left side when clicked again, and returns to the Genome Browser panel from the side bar's `Browser` button.
- `sessions-create-switcher` creates a session from the session menu's `New session`, which shows the Sessions panel with its New session form open, and opens it at `/browser/<id>`.
- `sessions-create-panel` creates a session from the Sessions panel heading's `New session` (+) button and opens it at `/browser/<id>`; `Cancel` or `Escape` closes the form without creating one.
- `sessions-rename` renames the open session inline from its title button and persists the change.
- `sessions-search` filters saved sessions by name or assembly in the Sessions panel and shows an empty state for non-matching queries.
- `sessions-copy` duplicates an existing session from its row actions menu as `Copy of <name>` and opens the copy.
- `sessions-delete` removes a session from its row actions menu and updates both the session menu and the Sessions panel.
- `sessions-delete-all` deletes every saved session after confirmation, leaving the browser with no session open; while a session is open and others are saved, the confirmation also offers `Delete all but current`, which keeps the open one.

## How to get to it (user POV)

- Click `Sessions` in the left navigation rail. On `/browser` it is a button that shows or hides the Sessions panel; from `/collections` or `/settings` it is a link that goes to the browser with the Sessions panel shown. `Browser` in the rail works the same way for the Genome Browser panel.
- Click the `Session menu` chevron next to the session name on `/browser`, then choose a recent session row, `All sessions` (shows the Sessions panel), or `New session` (shows the Sessions panel with its form open).
- In the Sessions panel, use the `Search sessions` field, the heading's `New session` (+) button, a session row, or `Delete all sessions` at the bottom.
- Click the open session's name in the `/browser` title bar to rename it inline (`Enter` saves, `Escape` cancels).
- Open `Actions for session <name>` on any session row in the session menu or the Sessions panel to `Save a copy` or `Delete`.
- The header's left-panel toggle and `Ctrl+B` hide and show whichever left panel was shown last.

## Driving it with verify-web

Preconditions:

- `@weng-lab/web` is launched and `verify-web.mjs doctor` reports `healthy: true` with `mode: "signed-in"`.
- The browser is at `/browser`.

- **Create from the session menu.** Run `verify-web.mjs browser find role button click --name "Session menu" --exact`, then `verify-web.mjs browser find role menuitem click --name "New session"`. The left side shows the `Sessions` panel with a form named `New session`. Run `verify-web.mjs browser find role textbox fill --name "Session name" "Verify Smoke Session"` and `verify-web.mjs browser find role button click --name "Create"`. Wait for `All changes saved` (`verify-web.mjs browser wait --text "All changes saved"`) and track loading (`verify-web.mjs browser wait --fn "!document.querySelector('[role=\"progressbar\"], svg animateTransform[type=\"rotate\"]')"`). The URL changes to `/browser/<id>`, the title button reads `Verify Smoke Session`, the Sessions panel stays shown with the new row checked, and the starter `hg38` tracks (`Coordinates`, `GENCODE 50 basic`, `Human cCREs`) render.
- **Rename inline.** Run `verify-web.mjs browser find role button click --name "Verify Smoke Session" --exact`, `verify-web.mjs browser find role textbox fill --name "Session name" "Verify Renamed Session"`, and `verify-web.mjs browser press Enter`. Wait for `All changes saved`. The title button and the Sessions panel row both read `Verify Renamed Session`. Click `Browser` in the rail (`verify-web.mjs browser find role button click --name "Browser" --exact`); the `Genome Browser` panel's `Current Session` card also reads `Verify Renamed Session`.
- **Toggle the Sessions panel and search.** Run `verify-web.mjs browser find role button click --name "Sessions" --exact` to show the Sessions panel, then `verify-web.mjs browser wait --text "Verify Renamed Session"`. Filter with a match: `verify-web.mjs browser find placeholder "Search sessions" fill "Renamed"` keeps `Verify Renamed Session` visible. Filter with a miss: `verify-web.mjs browser find placeholder "Search sessions" fill "zzzz-no-match"` shows `No sessions match “zzzz-no-match”.` Clear it with `verify-web.mjs browser find placeholder "Search sessions" fill ""`. Click `Sessions` in the rail again; the left side hides and neither rail button is highlighted. Click it once more to show the panel.
- **Create from the panel heading.** Run `verify-web.mjs browser find role button click --name "New session" --exact`; the form opens below the heading and the button stays tinted. Press `Escape` (`verify-web.mjs browser press Escape`); the form closes and no session is created. Open it again, fill `Session name` with `Verify Second Session`, and click `Create`. Wait for `All changes saved`; the URL changes to the new `/browser/<id>` and `Verify Second Session` is checked in the panel.
- **Confirm persistence across reload.** Wait for `All changes saved`, then reload (`verify-web.mjs browser reload`). The left side returns to the `Genome Browser` panel. Click `Sessions` in the rail and wait for both `Verify Renamed Session` and `Verify Second Session`.
- **Copy and delete one session.** Open the row menu (`verify-web.mjs browser find role button click --name "Actions for session Verify Renamed Session" --exact`) and click `Save a copy` (`verify-web.mjs browser find role menuitem click --name "Save a copy"`). Wait for `Copy of Verify Renamed Session`, which opens in the browser. Delete it with `verify-web.mjs browser find role button click --name "Actions for session Copy of Verify Renamed Session" --exact` and `verify-web.mjs browser find role menuitem click --name "Delete"`, then wait for it to disappear (`verify-web.mjs browser wait --fn "!document.body.innerText.includes('Copy of Verify Renamed Session')"`).
- **Delete all but current.** Open `Verify Second Session` from its panel row and wait for its title button. Click `Delete all sessions` (`verify-web.mjs browser find role button click --name "Delete all sessions"`). The `Delete all sessions?` dialog offers `Delete all but current`, `Cancel`, and `Delete all`. Click `Delete all but current` (`verify-web.mjs browser find role button click --name "Delete all but current"`). Only `Verify Second Session` remains listed and stays open.
- **Delete all.** Click `Delete all sessions` again. With no other sessions saved, the dialog offers only `Cancel` and `Delete all`. Click `Delete all` (`verify-web.mjs browser find role button click --name "Delete all" --exact`). The panel shows `No saved sessions yet.`, the browser shows no session, and `Delete all sessions` is disabled.
- **Proof.** Capture screenshots and ARIA snapshots after creating the session, of the Sessions panel with search applied, of the delete-all confirmation, and after deleting all: `verify-web.mjs screenshot sessions/browser-open`, `verify-web.mjs snapshot sessions/browser-open`, `verify-web.mjs screenshot sessions/panel-search`, `verify-web.mjs screenshot sessions/delete-all-confirm`, and `verify-web.mjs screenshot sessions/empty-after-delete`. Confirm `verify-web.mjs browser errors` prints no errors.

## Gotchas

- The session menu chevron is a `button` named `Session menu`. `Sessions` in the rail is a `button` on `/browser` but a `link` on other pages, so match its role to the page you are on.
- `New session` names both the session menu's `menuitem` and the Sessions panel heading's icon `button`; use `role menuitem` for the first and `role button --exact` for the second.
- The New session form's field and the inline rename field are both named `Session name`. Only one is shown at a time, so finish or cancel a rename before opening the form.
- Clicking the rail button for the panel already shown hides the left side instead of keeping it open. Check which panel is shown (its navy title row reads `Genome Browser` or `Sessions`) before clicking.
- The shown left panel is not saved across reloads; after `reload`, the `Genome Browser` panel is shown again.
- Standard buttons like `Create`, `Delete all sessions`, and `Delete all but current` may expose uppercase labels or a leading icon space, so omit `--exact` on them. `Delete all` needs `--exact` so it does not match `Delete all sessions` or `Delete all but current`.
- `Delete all sessions` deletes every saved session, whatever the search field shows. It is disabled while there are no sessions, while they cannot be reached, or while another session operation runs. If one session cannot be deleted, the alert reads `Could not delete every session. Try again.` (or `Could not delete every other session. Try again.` for `Delete all but current`).
- While a copy or delete is in flight, all session row action buttons are temporarily disabled. Wait for the previous deletion to disappear before clicking the next row's actions button.
- The rename field selects all text on focus and saves on blur or `Enter`; pressing `Enter` with an empty value keeps the field open with a validation prompt.
- Always wait for `All changes saved` before reloading or navigating away to assert persistence.
