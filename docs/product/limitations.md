# App limitations

These are current implementation constraints and deployment gaps. They do not redefine the [MVP scope](mvp.md): missing authorization, for example, is work needed for launch rather than a product exclusion. Setup and supported operations are documented in the [web app guide](../../apps/web/README.md) and [agent guide](../../apps/web/docs/02-guides/agent.md).

## Identity and deployment

- Real Clerk sign-in works with the development instance on Vercel previews. Sign-in through the lab's production instance is unverified until Production has a `wenglab.org` domain. Mock account switching, replaced Clerk sign-out hooks, and server requests through the real proxy with locally signed tokens have automated coverage.
- App account controls save or ask the user to discard before changing accounts. External account changes, such as another tab signing out or the Clerk session ending, may discard unsaved state. Old credentials cannot save it, and a new account must not see it. Clerk multi-session switching is not offered.
- Cloud SQL connections from Vercel are unverified against a deployment. Preview and Production share development resources; see [production deployment](production.md). Each server process holds up to five connections; validate the instance's connection limit against expected concurrency before production deployment.
- The agent channel delegates hosted authorization to Next.js for Clerk identity, browser-session ownership, and the RC preference. Conversation access bindings expire after 24 hours; reload the page to start a new ephemeral chat. Local development calls Next.js at `http://localhost:3000`. External MCP uses the app-owned `/api/mcp` endpoint with Clerk OAuth; client onboarding must be enabled in the Clerk instance. Protected Vercel previews additionally require deployment access.
- A tab's command stream lasts at most one function invocation on Vercel (`maxDuration` 300 seconds). The tab then reconnects; commands in flight at that moment fail and are not replayed. New tabs supersede older attachments without waiting for stale cleanup; superseded retries cannot take control back. Reloading a superseded tab creates a new attachment. Redis routing is isolated per deployment.
- Next.js binds to `localhost` for Clerk request handling. This can resolve only to `::1`, so IPv4 clients or SSH forwarding to `127.0.0.1` may fail. Use the documented localhost URL and check the listening address before configuring a tunnel.

## Session behavior

- Several tabs may edit one session. A tab whose edits are based on an older revision gets a conflict instead of overwriting; the user saves over the other version or discards the edits. Tabs do not receive or merge each other's edits.
- Unsaved edits live only in the tab. They are lost if it crashes or closes; there is no offline or crash-recovery storage.
- `beforeunload` requests a warning for unsaved edits. Browsers may suppress it, and it does not guarantee a save. The app does not save during unload.
- While a session restores, the previous browser may remain visible under the target URL. Failed restoration keeps the previous session and returns its URL.
- Only hg38 sessions can be created or restored by the app.
- Merged gene tracks save their data-dependent height in track configuration. A new session can save shortly after first render without a user edit; saved height follows loaded data.

## Remote control

- Chat belongs to its mounted panel. Navigating away from the browser page cancels the active turn and resets the conversation. Preserving agent conversations across navigation is deferred.

- RC is a persisted user preference. Same-browser tabs refresh it on changes, and other devices refresh on focus. New command connections and replies check it server-side. Immediate revocation of every existing stream and LLM turn across devices, and exclusive browser editing during an agent turn, remain to be implemented.

- A timeout or disconnect can occur after a command changed the stores but before its reply arrived. A failed call does not prove that nothing changed.
- A terminal save failure, such as deletion elsewhere, disables remote control for that session. Remote control resumes when the next session opens. Refused edits that a further edit can fix do not end the attachment.

[Back to app direction](README.md)
