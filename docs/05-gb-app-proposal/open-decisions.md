# Open decisions

These questions are intentionally separate from the agreed release scope. Resolve each when it affects the next piece of work. A proposal here is not an instruction to build it.

## Discuss with the PIs

### Collection import and persistence

There is no collection editor in this release. Users load collection JSON and choose tracks from it. Local import is part of the plan; cloud import timing remains open.

Decide whether imported JSON belongs to a session, the user's collection list, or both. That answer should guide persistence and the collection picker. Do not build a collection-management system before agreeing on the required actions.

### Guest and account Eve limits

Guests get a heavily limited preview of Eve. Signed-in users get a larger allowance. Decide the budgets, how anonymous usage is counted, and what the UI shows when the limit is reached. Check that the chosen limits fit the operating budget before public access.

## Resolve during implementation

### Local folder exposure

Users need to expose project data and remember locations between launches. A config file in `~/.gb/` is one proposal. Decide the launch-folder default, how users add or remove locations, and what happens when `gb` starts from the home directory. Make the exposed locations clear to the user, especially when launching from the home directory.

### Session saves and conflicting tabs

Persist the serializable browser and track state with basic metadata. Decide when saves happen and how failures are shown. Exact fields and migration details can follow the implementation.

A second web browser tab can silently overwrite newer saved state. We need to handle this gracefully, but it is outside the first implementation pass. Decide whether a save-version check belongs in the January release and how the user recovers from a conflict. Live tab synchronization and automatic merging are outside the release scope.

### Guest sign-in transition

Guests have no persistent sessions. Decide whether signing in carries their current browser state into a new saved session. Preserving the current view is the suggested behavior, but the save timing and UI still need agreement.

### Agent integration details

Choose the first ACP agent to support and test the setup with a real user install. Keep the initial MCP tools tied to the store actions needed for ordinary browser use. A detailed tool inventory, chat-history persistence, and agent process lifetime can be settled while building these integrations.

## Deferred

Local sign-in to cloud sessions, cloud file uploads, a collection editor, configurable browser-tool permissions, scientific analysis tools, embedded views inside AI applications, and live multi-tab synchronization are later work. Connecting a user's own local model to the cloud chat panel is also outside the current scope.

Once a decision is made, update the relevant design or delivery milestone and remove its question here. The [reference notes](references/README.md) preserve earlier ideas for discussion; they do not need to stay in step with this proposal.

[Back to release scope](README.md)
