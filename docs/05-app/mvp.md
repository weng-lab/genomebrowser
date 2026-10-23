# MVP scope

This is the scope we agreed on in October 2026. It describes what we want to ship, not what is already implemented. Small details can be filled in as we build; changes to the scope should be discussed. GitHub issues track the work and its progress; this document is not a completion checklist.

## What we're building

An agentic genome browser that is easy to get into and useful enough that researchers choose it over their usual browser. The agent helps set up and operate the browser. Fast, usable manual controls matter just as much: every agent operation should also be available through the UI.

We're building for genome-browser users broadly, including people who find existing tools hard to approach. We'll put it in the lab's hands during development, learn from real work, and open it to public use. The useful signal is whether people come back and what still sends them to another browser.

## The first workflow

Start a session, visit a few loci, add tracks, and save interesting regions. Ask the agent to look up a gene, SNP, or cCRE, navigate there, add a track from a URL, and highlight a region. Adjust the view manually, export an image, and return later to the saved setup.

That is the first complete workflow we want to make good. It doesn't require the agent to draw biological conclusions or do research independently.

## What's in

### Tracks and collections

- Add tracks from user-hosted URLs, with clear errors when a source cannot be loaded. Supported formats still need to be listed.
- Browse and search predefined collections, select some or all of their tracks, and see which are already loaded.
- Create, rename, delete, and reopen personal collections on an account. Add entries from URLs or tracks in the current session, and remove entries.
- Tie each collection to one assembly. Loading an entry creates an independent track instance; edits to the collection and session do not silently update each other.
- Reject an addition that would exceed the session's track limit. Don't silently add only part of a selection. The limit is still TBD.
- Sort tracks once by a selected metadata field and save the resulting order. Adding or changing tracks afterward does not trigger another sort.

We'll supply and host the curated data. Other team members will prepare UCSC-derived track sets; development work is converting those lists to collection JSON and mapping the relevant UCSC settings to ours. A live UCSC integration is outside this scope.

Personal collections initially store track configurations and source URLs. They don't upload or host the underlying files.

### Regions and images

Saved regions of interest and highlights are the same feature. Use the existing highlights data for named regions, with a list in the UI for creating, editing, deleting, and navigating to them. Save their coordinates, color, opacity, and filled or outlined style with the session. Zero opacity hides the highlight without losing the saved region.

Image export is available manually and through the agent. The image is shown to the user; it is not sent to the model.

### The integrated agent

The agent works on the active session through the browser tab's connection. Its initial capabilities are:

- Read the current browser state, including the locus, loaded tracks, and track metadata.
- Add tracks from explicit URLs, and remove, configure, reorder, or sort loaded tracks.
- Navigate and create, edit, or delete saved regions/highlights.
- Look up genes, SNPs, and cCREs by a requested name or ID through MCP tools wrapping selected GraphQL queries. Return real API data. The exact tool contracts still need to be defined.
- Export a browser image for the user.

Track discovery across collections and agent loading from collections come later. The manual collection feature comes first, then we build agent capabilities on top. Collection creation and management remain manual for the MVP.

### Who has control

Either the user or the agent controls the browser. While the agent works, browser editing is blocked, and the user can stop it and take control. Completed changes stay when the agent is interrupted; stopping it prevents further changes.

Agent and manual operations change the same session state. There is no separate agent version of the browser. Parallel agent work across sessions is outside the MVP.

Agent features start enabled and are clearly part of the product. A consent popup is not required for MVP. When enabled, the agent can see track metadata, URLs, and the current genomic location.

An account-wide setting disables all LLM operations. It closes the MCP connection and prevents reconnection, data access, and further commands. It must stop access, not merely hide the panel. Manual browsing remains available.

### Sessions and guests

Opening a session makes it the active context across the app within that browser tab. Other pages show which session is active and use it as the default destination for actions such as adding collection tracks. Page navigation preserves the session and its authorized MCP connection, subject to the agent-off setting. Explicit actions on inactive sessions may be added without silently switching the active session; their details remain open.

Signed-in users can save and reopen sessions across devices. "Save a copy" duplicates the current setup into a new independent session, including tracks, settings, and saved regions. Once history exists, copies should include it too.

Chats are ephemeral for MVP. Refreshing can reset the conversation, while saved browser changes remain. The agent is a control surface for the session; chat recovery is not a launch promise.

Guests get one session, restored in the same browser, and cannot create additional sessions without signing in. Preserve their work when they sign in. The storage mechanism is still open; cross-device restoration requires an account.

Guests can try the agent with a small allowance keyed to their session. Manual browsing remains available after it runs out. We accept that clearing browser storage may bypass this trial limit. The exact allowance remains TBD.

## What comes next

These are follow-ups worth keeping, not requirements hidden in the MVP:

- **Track discovery:** search metadata across collections for the current genome, then let the agent load matching tracks. High priority. Use bounded results rather than putting hundreds of track descriptions into context.
- **Hosted uploads:** help users upload local files to remote storage and load them as tracks. High priority. Until then, users host files themselves and supply URLs. Storage lifetime and relinking behavior need a separate decision.
- **History and undo/redo:** start with simple linear history for session state, saved alongside the session and copied when forking. The working idea is roughly ten meaningful actions, with one completed command or UI operation per step. The mechanism is open; it does not require committing to a large command framework now.
- **Richer recovery:** branching history and restoring to a point in an agent conversation, after basic history exists.
- **External MCP clients:** optional if time allows, otherwise later. Access needs OAuth and authorization to the user's own session.
- **Collection sharing and chat persistence.**

There is no guaranteed undo in the MVP. Stopping the agent leaves completed changes in place. Users can make a session copy before experimenting, but that is not a substitute for automatic recovery.

## Still to decide

Keep these open for implementation and stakeholder conversations:

- Track limits, guest request allowances, and any signed-in agent limits.
- Supported URL formats and launch assemblies.
- Initial collection contents and the UCSC settings we map.
- Gene, SNP, and cCRE query/tool contracts and the fields they return.
- Guest storage and the details of preserving work on sign-in.
- The UI details for agent control, errors, and partially completed requests.

We'll learn through lab testing before adding much analytics. If we add usage events, avoid collecting sensitive research content; the exact events can be decided later.

## Try this before calling it ready

Have someone start as a guest, add reference and URL tracks, save a region, and return to the same browser. Let them try the agent for lookup, navigation, track setup, and highlighting. Check that stopping it returns control, and disabling it prevents further agent access while manual browsing still works.

Then have them sign in, keep their work, create and reuse a personal collection, copy a session, export an image, and reopen their saved setup. Watch where they get stuck and ask what would still make them go back to their usual browser.

[Back to app direction](README.md)
