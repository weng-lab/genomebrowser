# Agent access and control

This page describes the intended agent behavior for the [MVP](mvp.md) and the implementation decisions still open. The current app has a connection-information panel and two tools: `set_region` and `export_image`, which shows the user an image preview with a Download button. Integrated chat, authenticated MCP access, and exclusive human/agent control are not implemented yet.

## A control surface for the active session

The integrated panel helps set up and operate the session open in its browser tab. Agent commands and manual controls act on the same browser and track stores. A run targets the session where it started; switching sessions cannot silently redirect its commands.

Control is exclusive: either the researcher or the agent can edit the browser. The researcher can stop the agent and take control. Already-completed changes remain, and no further mutations from that run are accepted. A failed or interrupted request can therefore leave useful partial work. History and undo are outside the MVP.

Chats are ephemeral. Reloading may reset the conversation without resetting saved browser state. Conversation restoration and durable agent runs are not launch requirements. Even an ephemeral conversation needs authorization while it exists; its identifier does not grant access to a browser session.

## Launch capabilities

The [MVP agent scope](mvp.md#the-integrated-agent) is the source of the action list. It includes state inspection, URL tracks, manipulation of loaded tracks, navigation, saved regions, image export, and gene/SNP/cCRE lookup.

The lookup tools will wrap selected GraphQL queries to return API data for requested names or IDs. Their contracts and execution location are still to be designed. They are distinct from commands that mutate the browser tab.

Collection search and agent loading from collections are follow-ups. Account-wide session discovery, agent session creation, and parallel work across sessions are not prerequisites for the integrated panel.

## Identity and access

Signed-in agent access belongs to the authenticated user and their authorized session. The server verifies identity rather than trusting an acting user ID supplied by the model. Browser attachments, commands, and replies need authorization as well as the agent endpoint. Knowing a session ID is not sufficient.

Guests can use the agent with a small allowance keyed to their guest session. The guest credential and attachment design is open; the product still needs to distinguish an authorized guest tab from a caller who merely knows its session ID. The allowance is a trial limit, not a reliable per-person identity check.

The current repository keeps saved-session ownership and database access in Next.js. The MCP server handles tool calls and command delivery without database access. Authenticated delegation or attachment credentials can connect those responsibilities; the precise issuance, expiry, and revocation mechanism is unresolved.

## Enabled by default, with a hard off switch

Agent features start enabled. The agent can read browser state, track metadata, source URLs, and the current locus. There is no required first-use consent gate in the MVP. Exported images go to the user, not into model context.

The account-wide setting disables all LLM operations. It closes MCP connections and prevents reconnection, new reads, and commands across the user's tabs. It also stops active agent work from applying further changes. Hiding the panel alone does not meet this requirement. Disabling access cannot recall data already sent or reverse completed changes.

Guest preference storage and enforcement details belong with the guest access design. Manual browsing remains available whether agents are disabled, unavailable, or rate-limited.

## Integration choices still open

Vercel Eve is an option for the embedded panel, not a product requirement. The provider and SDK integration need evaluation against ephemeral chat, session authorization, interruption, and the hard off switch. An app cookie or a shared origin alone does not establish authorization for a separate agent service.

External MCP clients are a follow-up, or optional work if time allows. They require OAuth and access restricted to the user's own session. Their discovery and target-selection ergonomics do not need to be built before the integrated panel.

[Back to app direction](README.md)
