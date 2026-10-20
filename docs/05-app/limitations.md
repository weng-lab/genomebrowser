# App limitations

These are current constraints and deployment gaps, not unfinished refactor steps. Setup and supported operations are documented in the [web app guide](../../apps/web/README.md) and [MCP server guide](../../apps/server/README.md).

## Identity and deployment

- Real Clerk frontend sign-in is unverified because credentials were unavailable. Mock account switching, replaced Clerk sign-out hooks, and server requests through the real proxy with locally signed tokens have coverage. Verify a Clerk development instance before relying on frontend sign-in.
- App account controls save or ask the user to discard before changing accounts. External account changes, such as another tab signing out or the Clerk session ending, may discard unsaved state. Old credentials cannot save it, and a new account must not see it. Clerk multi-session switching is not offered.
- Cloud SQL deployment and serverless pool sizing are unverified. The `pg` pool uses its defaults; validate connection limits before production deployment.
- MCP has no authentication or session authorization and stays on loopback. Any caller that can reach it and knows a session ID can control a connected tab. Cloud MCP needs both access controls and hosting that supports persistent SSE connections; a provider has not been selected.
- Next.js binds to `localhost` for Clerk request handling. This can resolve only to `::1`, so IPv4 clients or SSH forwarding to `127.0.0.1` may fail. Use the documented localhost URL and check the listening address before configuring a tunnel.

## Session behavior

- Several tabs may edit one session. A tab whose edits are based on an older revision gets a conflict instead of overwriting; the user saves over the other version or discards the edits. Tabs do not receive or merge each other's edits.
- Unsaved edits live only in the tab. They are lost if it crashes or closes; there is no offline or crash-recovery storage.
- `beforeunload` requests a warning for unsaved edits. Browsers may suppress it, and it does not guarantee a save. The app does not save during unload.
- While a session restores, the previous browser may remain visible under the target URL. Failed restoration keeps the previous session and returns its URL.
- Only hg38 sessions can be created or restored by the app.
- Merged gene tracks save their data-dependent height in track configuration. A new session can save shortly after first render without a user edit; saved height follows loaded data.

## Remote control

- A timeout or disconnect can occur after a command changed the stores but before its reply arrived. A failed call does not prove that nothing changed.
- A terminal save failure, such as deletion elsewhere, disables MCP for that session. Remote control resumes when the next session opens. Refused edits that a further edit can fix do not end the attachment.

[Back to app direction](README.md)
