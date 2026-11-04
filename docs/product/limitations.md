# App limitations

These are current implementation constraints and deployment gaps. They do not redefine the [MVP scope](mvp.md): missing authorization, for example, is work needed for launch rather than a product exclusion. Setup and supported operations are documented in the [web app guide](../../apps/web/README.md).

## Identity and deployment

- Every environment, local development included, signs in through Clerk; there are no mock accounts. Real Clerk sign-in works with the development instance locally and on Vercel previews. Sign-in through the lab's production instance is unverified until Production has a `wenglab.org` domain. Account changes through the app's menu and elsewhere, and server requests through the real proxy with locally signed tokens, have automated coverage.
- A Clerk development instance keeps each site's sign-in separately, so every new preview deployment URL starts signed out.
- App account controls save or ask the user to discard before changing accounts. External account changes, such as another tab signing out or the Clerk session ending, may discard unsaved state. Old credentials cannot save it, and a new account must not see it. Clerk multi-session switching is not offered.
- Cloud SQL connections from Vercel are unverified against a deployment. Preview and Production share development resources; see [production deployment](production.md). Each server process holds up to five connections; validate the instance's connection limit against expected concurrency before production deployment.
- MCP accepts the session owner's Clerk session token or a Clerk-issued OAuth access token. OAuth discovery and onboarding for external clients are not built yet, so outside automated tests a client needs a token obtained separately. Remote control and MCP on a deployment are unverified against a hosted Redis.
- Next.js binds to `localhost` for Clerk request handling. This can resolve only to `::1`, so IPv4 clients or SSH forwarding to `127.0.0.1` may fail. Use the documented localhost URL and check the listening address before configuring a tunnel.

## Session behavior

- Several tabs may edit one session. A tab whose edits are based on an older revision gets a conflict instead of overwriting; the user saves over the other version or discards the edits. Tabs do not receive or merge each other's edits.
- Unsaved edits live only in the tab. They are lost if it crashes or closes; there is no offline or crash-recovery storage.
- `beforeunload` requests a warning for unsaved edits. Browsers may suppress it, and it does not guarantee a save. The app does not save during unload.
- While a session restores, the previous browser may remain visible under the target URL. Failed restoration keeps the previous session and returns its URL.
- Only hg38 sessions can be created or restored by the app.
- Merged gene tracks save their data-dependent height in track configuration. A new session can save shortly after first render without a user edit; saved height follows loaded data.

## Remote control

- The server checks the account preference for every tool call, tab connection, and reply, but does not close streams already open. Those tabs disconnect when their window regains focus or reloads; commands sent to them meanwhile are refused at dispatch.
- A connection whose server instance stopped without cleanup keeps its session's lease for up to 45 seconds. Until then, a different tab or a new attachment of the same tab is refused and keeps retrying.
- Cancellation is cooperative: the tab stops a command that is still running, but a change already applied stays.
- A timeout or disconnect can occur after a command changed the stores but before its reply arrived. A failed call does not prove that nothing changed.
- A terminal save failure, such as deletion elsewhere, disables MCP for that session. Remote control resumes when the next session opens. Refused edits that a further edit can fix do not end the attachment.

[Back to app direction](README.md)
