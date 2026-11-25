# Settings and MCP remote control

Settings and MCP remote control lets a signed-in user allow or disallow AI agent control of their open browser session, see connection status in `/settings` and the browser's `AI Assist` right panel, and let an authorized MCP client run commands (such as `list_tracks` and `set_region`) directly in the live browser tab.

## Sub-features

- `settings-toggle` disables and re-enables `Allow agents to control my open session` on `/settings` and persists the preference across reloads.
- `agent-panel-status` shows `Connected. MCP tools called with sessionId "<id>" run in this tab.` when enabled with an open session, or `Remote control is off. Turn it on in Settings.` when disabled.
- `mcp-auth-reject` rejects unauthenticated `/api/mcp` requests with HTTP 401.
- `mcp-roundtrip` executes an authenticated MCP tool call (`list_tracks` or `set_region`) against `/api/mcp`, which reads or updates the saved session on the server; every open tab of that session updates live.

## How to get to it (user POV)

- Click `Settings` at the bottom of the left navigation rail (or visit `/settings`) and toggle `Allow agents to control my open session`.
- On `/browser/<id>`, view the `AI Assist` right panel (open by default; toggle with `Hide AI Assist panel (Ctrl+Alt+B)` / `Show AI Assist panel (Ctrl+Alt+B)` or `Ctrl+Alt+B`).
- Connect an MCP client to `http://localhost:<port>/api/mcp` with `Authorization: Bearer <clerk-session-token>` and the open session's `sessionId` from `/browser/<id>`.

## Driving it with verify-web

Preconditions:

- `@weng-lab/web` is healthy (`verify-web.mjs doctor` passes with `mode: "signed-in"`).
- `verify-web.mjs doctor` reports `redis` `ok: true` (`PONG`). If Redis is unreachable, report `agent-panel-status` (`Connected`) and `mcp-roundtrip` as blocked by Redis rather than skipping silently.
- A session is open at `/browser/<id>` (capture `<id>` from `verify-web.mjs browser get url`).

- **Confirm unauthenticated MCP rejection.** From the shell, probe `/api/mcp` without a token: `curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3099/api/mcp -H "Content-Type: application/json" -d '{}'`. Output must be `401`.
- **Confirm default connected status in AI Assist.** With a session open at `/browser/<id>` (new accounts start with Remote Control enabled and `AI Assist` open), wait for `verify-web.mjs browser wait --text "Connected. MCP tools called with sessionId"`. The panel displays the active session's ID.
- **Run an MCP round-trip (`list_tracks` and `set_region`).** Obtain a short-lived Bearer token in memory (`TOKEN="$(.agents/skills/verify-web/scripts/verify-web.mjs mcp-token)"`), then send a JSON-RPC `tools/call` request to `http://localhost:3099/api/mcp` with `Accept: application/json, text/event-stream`, `Content-Type: application/json`, and `Authorization: Bearer $TOKEN` calling `list_tracks` (returns the open session's tracks) and `set_region` (moves the open tab to `chr12:53385000-53400000`). Confirm the response succeeds and the live browser toolbar immediately reflects the new `chr12` coordinates.
- **Toggle Remote Control off and verify persistence.** Click `Settings` in the navigation rail (`verify-web.mjs browser find role link click --name "Settings" --exact`). Wait for the switch `Allow agents to control my open session` to finish loading, click it off (`verify-web.mjs browser find role switch click --name "Allow agents to control my open session"`), wait for `Off`, reload (`verify-web.mjs browser reload`), and confirm the switch remains unchecked. Return to `Browser` (`verify-web.mjs browser find role link click --name "Browser" --exact`) and confirm `AI Assist` reads `Remote control is off. Turn it on in Settings.`.
- **Restore default setting.** Return to `/settings` and toggle `Allow agents to control my open session` back on so subsequent verification runs start from the account default.
- **Proof.** Capture screenshots of the connected `AI Assist` panel, the browser after the MCP `set_region` command, and `/settings` toggled off: `verify-web.mjs screenshot remote-control/connected`, `verify-web.mjs screenshot remote-control/after-mcp`, and `verify-web.mjs screenshot remote-control/settings-off`. Never save `$TOKEN` into any proof artifact or log.

## Gotchas

- New accounts start with Remote Control enabled (`Allow agents to control my open session` checked) and the `AI Assist` panel expanded.
- Always send MCP requests to the same verification server port that hosts the open browser tab so the command reaches that tab's connection.
- Only one tab per session ID holds the agent connection, which AI Assist chat and browser-only tools (`export_image`, `add_tracks_from_urls`, `take_control`, `release_control`) need; another tab of the same session stays at `Connecting… If this session is open in another tab, close that tab…`. State tools (`set_region`, `list_tracks`, `sort_tracks`, `set_track_metadata`) run on the server whether or not a tab is open, and every open tab of the session shows their result.
- The Remote Control preference belongs to the signed-in account, not the session. Restore it to the default (`on`) if you toggle it off during verification.
- Never log or commit the output of `verify-web.mjs mcp-token`.
