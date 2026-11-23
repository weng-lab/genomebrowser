# App limitations

These are current implementation constraints and deployment gaps. They do not redefine the [MVP scope](mvp.md): missing authorization, for example, is work needed for launch rather than a product exclusion. Setup and supported operations are documented in the [web app guide](../../apps/web/README.md).

## Identity and deployment

- Every environment, local development included, signs in through Clerk; there are no mock accounts. Real Clerk sign-in works with the development instance locally and on Vercel previews. Sign-in through the lab's production instance is unverified until Production has a `wenglab.org` domain. Account changes through the app's menu and elsewhere, and server requests through the real proxy with locally signed tokens, have automated coverage.
- A Clerk development instance keeps each site's sign-in separately, so every new preview deployment URL starts signed out.
- App account controls save or ask the user to discard before changing accounts. External account changes, such as another tab signing out or the Clerk session ending, may discard unsaved state. Old credentials cannot save it, and a new account must not see it. Clerk multi-session switching is not offered.
- Cloud SQL connections from Vercel are unverified against a deployment. Preview and Production share development resources; see [production deployment](production.md). Each server process holds up to five connections; validate the instance's connection limit against expected concurrency before production deployment.
- MCP accepts the session owner's Clerk session token, a Clerk-issued OAuth access token, or a short-lived token Eve issues for one session. OAuth discovery and onboarding for external clients are not built yet, so outside automated tests a client needs a token obtained separately. Remote control and MCP on a deployment are unverified against a hosted Redis.
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

## Agent panel

- An idle thread rolls over only when its session's panel opens with the tab connected; until then the user sees "Summarizing the earlier conversation…". A conversation Eve no longer has, such as one that expired after 30 idle days, starts a new thread without a summary of it.
- "Save a copy" with the agent's conversation gives the copy the original's summary plus its current conversation's text, up to the last 80 messages or 20,000 characters. Tool calls and their results are left out, and the copy's agent starts a new conversation with that as background.
- The summary is only as good as the agent's last turn makes it. If writing it fails, the thread still rolls over and the earlier summary stays.
- Two tabs that send a session's first message at the same moment can each start a conversation. The app keeps the first one and ends the other; the second tab must reload to continue the session's thread.
- Only the first tab attached to a session receives agent commands. Another tab is refused until the first one closes.
- A run stops before its next model call once no tab has held its session for 5 seconds, so a reply already streaming finishes first. Turning Remote Control off closes the tab's connection, which stops the run the same way.
- Switching sessions asks first only when the switch comes from a session URL, such as a link or history. Leaving the browser page for another workspace page, such as Settings, keeps the run going, and the panel shows it again on return. The browser's own leave-page prompt, shown while a run is active, has fixed wording, and browsers may skip it.
- In local development without `AI_GATEWAY_API_KEY`, the model comes from a provider key or Eve's own sign-in; on Vercel and in production builds it comes from AI Gateway. The app and agent code paths are otherwise the same.

[Back to app direction](README.md)
