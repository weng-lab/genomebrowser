# App limitations

These are current implementation constraints and deployment gaps. They do not redefine the [MVP scope](mvp.md): missing authorization, for example, is work needed for launch rather than a product exclusion. Setup and supported operations are documented in the [web app guide](../../apps/web/README.md) and [MCP server guide](../../apps/server/README.md).

## Identity and deployment

- Real Clerk frontend sign-in is unverified because credentials were unavailable. Mock account switching, replaced Clerk sign-out hooks, and server requests through the real proxy with locally signed tokens have coverage. Verify a Clerk development instance before relying on frontend sign-in.
- App account controls save or ask the user to discard before changing accounts. External account changes, such as another tab signing out or the Clerk session ending, may discard unsaved state. Old credentials cannot save it, and a new account must not see it. Clerk multi-session switching is not offered.
- Cloud SQL connections from Vercel are unverified against a deployment, and only previews have Google access. Each server process holds up to five connections; validate the instance's connection limit against expected concurrency before production deployment.
- MCP has no authentication or session authorization and stays on loopback. Any caller that can reach it and knows a session ID can control a connected tab. The cloud variant targets [Google Cloud Run](README.md#mcp-server); deployment still needs access controls and changes to the loopback-only listener and Host checks. Its in-memory tab registry requires a single instance, which Cloud Run's maximum-instances setting does not strictly guarantee, and SSE connections close at Cloud Run's request timeout, after which the tab reconnects and in-flight commands fail.
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
