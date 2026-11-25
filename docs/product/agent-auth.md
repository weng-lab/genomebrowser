# Agent access and control

This page covers who may use the agent and what it may reach. The [agent panel PRD](agent-panel-prd.md) owns conversation behavior: threads, runs, and the control lock. The [MVP](mvp.md#the-integrated-agent) owns the list of agent capabilities.

## What is implemented

The workspace has an Eve chat panel with Stop, served by the Next.js app through `withEve` in every environment. It operates the open session through six MCP tools: `set_region`, `export_image`, which shows the user an image preview with a Download button, `sort_tracks`, `add_tracks_from_urls`, which checks hosted files before adding them as tracks, all or none, `list_tracks`, which lists loaded tracks with their metadata, and `set_track_metadata`, which tags tracks. Eve consumes `/api/mcp` like any external client. External callers authenticate with Clerk identity; OAuth onboarding for them is not built yet.

Each saved session keeps one agent thread, which reopens after a reload and on other devices. A run lives only while a tab holds its session: switching sessions asks first and then stops it, and a run whose tab closes stops within a few seconds. Preferences and the control lock are planned in the PRD.

## A control surface for the active session

The panel helps set up and operate the session open in its tab. Agent commands and manual controls act on the same browser and track stores; there is no separate agent copy of the browser. A run belongs to the session where it started, and switching sessions cannot redirect its commands.

The user can stop the agent at any time. Completed changes remain, and the stopped run applies no further changes, so a failed or interrupted request can leave useful partial work. History and undo are outside the MVP.

## Identity and access

The agent is for signed-in users. Agent access belongs to the authenticated user and a session they own. The server derives identity and never trusts a user ID supplied by the model, and knowing a session ID grants nothing.

Next.js owns session ownership, the MCP endpoint, and command delivery. For every request on an Eve conversation, Eve calls back to `/api/sessions/[id]/agent-auth`, which checks the signed-in user and, except for Stop, session ownership and the Remote Control preference. The app records each new conversation as its session's thread, and reads, follow-ups, and Stop on a conversation must name that session's thread. For tool calls, Eve exchanges its verified caller for a short-lived token scoped to one session; the tools take their session ID from that token, outside model input, so a session ID the model writes changes nothing, and user cookies and Clerk tokens never enter model context.

`/api/mcp` checks the caller's identity, session ownership, and the Remote Control preference on every tool call. It accepts the scoped Eve tokens, Clerk session tokens, and Clerk-issued OAuth access tokens. The tab receives commands and sends replies through `/api/sessions/[id]/commands`, which runs the same checks with the signed-in Clerk session.

## Enabled by default, with a hard off switch

Agent features start enabled. The agent can read browser state, track metadata, source URLs, and the current locus. There is no first-use consent gate in the MVP. Exported images go to the user, not into model context.

The account-wide setting disables all LLM operations. It closes MCP connections and prevents reconnection, new reads, and commands across the user's tabs, and stops active agent work from applying further changes. Hiding the panel alone does not meet this requirement. Turning it off cannot recall data already sent or reverse completed changes.

The setting is saved per account and starts on. Each tab stops connecting when it is off, and the server refuses tool calls, tab connections, and replies for the account from the moment it is saved off. A command already running in a tab can still finish, and other open tabs close their connections when their window regains focus or reloads. Stop keeps working after the setting is turned off, so the user can always end a run. Deleting a session ends its conversation in Eve and deletes its thread, and closing the session in the tab cancels its run first. Manual browsing remains available whether the agent is off or unavailable.

## External agents

External MCP clients are a follow-up. They need OAuth onboarding and access restricted to the user's own sessions, tracked in #392.

[Back to app direction](README.md)
