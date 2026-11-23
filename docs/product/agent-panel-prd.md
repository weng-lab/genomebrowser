# Agent panel PRD: threads, runs, and control

This PRD defines the fundamental behavior of the integrated agent panel for production: how conversations persist, what the agent knows, how runs start and stop, and how the agent and the user share the browser. [MVP scope](mvp.md), [agent access](agent-auth.md), and [sessions](sessions.md) link here for these topics, and [limitations](limitations.md#agent-panel) records how far the current code is from this intent.

The goal is a small, reliable foundation. Anything not needed for the agent to work correctly is listed under [later](#later) instead of being built now.

## Scope

The agent is for signed-in users only. Guests see no agent panel; a guest agent experience is designed separately later.

The agent stays a control surface for the open session. It operates the browser through MCP tools sent to the tab that holds the session. It does not research independently or keep memory across sessions.

## Threads

Each saved session has one agent thread, keyed on the session ID. Opening a session, on any device or after a reload, loads that session's thread and its messages. The panel never shows another session's thread.

A thread never rolls over on its own. Eve 1.3 compacts long threads automatically: once a thread nears the model's context window, Eve summarizes its older turns and keeps the most recent ones word for word, so the agent keeps working without the app managing memory. The app sets compaction to start at 75% of the context window.

**New conversation** in the panel starts the session's thread clean: the app ends the current Eve session, and the next message starts a new one with no summary or history from the old one. The old messages are gone from the panel. New conversation is unavailable while a run is in progress.

### Storage and Eve retention

Postgres stores, per session, only the current Eve session ID. It never stores transcripts or summaries; Eve holds the messages.

Private Eve sessions outside development use zero retention: Eve keeps messages while a session is active and deletes them when it ends. So the app turns off Eve's idle timeout (`sessionTimeoutMs: false`), and a thread lives as long as its session, until New conversation or deletion ends it. If Eve can no longer continue a thread, such as one stranded by an incompatible Eve upgrade, the panel starts a clean thread instead.

The thread record is also the conversation's access check: Eve's channel asks the app whether a conversation is the session's thread before every read, follow-up, and Stop.

### Session operations

- **Delete:** deleting a session deletes its thread record and ends its run.
- **Save a copy:** the copy is a new session with its own clean thread. Nothing from the original's agent conversation carries over.
- **Switch session:** the panel loads the new session's thread. See [runs](#runs) for what happens to work in progress.

## What the agent knows

The app adds a few facts to the agent's context before each message, so a renamed session or edited preferences apply from the next message on:

- The session ID, assembly, such as hg38, and session title.
- The user's preferences text.

Preferences are a free-text field on the settings page, about 1,000 characters at most, that works like an `AGENTS.md` for the user: tone, defaults, habits. They apply to every session.

The agent reads browser state through tools, not injected context. A `get_browser_state` tool is a follow-up; until then `list_tracks` is the only state read.

## Runs

A run lives only while its session is open in a tab, because every tool acts on the tab's browser stores.

- **Sending:** while a run is in progress, the message input is disabled and a Stop button replaces Send. Stop cancels the run.
- **Switching sessions mid-run:** the app warns "Your agent is still working. Switching will stop it." Confirming cancels the run and switches.
- **Closing or reloading the tab mid-run:** the browser shows its generic leave-page prompt. If the session's tab detaches and does not reattach within a short grace period, the server cancels the run. A quick reload that reattaches in time keeps the run going.

Cancellation leaves completed changes in place. The thread records that the run was stopped, so the next message does not assume the work finished.

When a tool fails because no tab holds the session, the agent says what it completed and what it did not. The agent reports a change as done only after its tool succeeds.

Errors from the model provider or Eve appear as a simple message in the chat. Manual browsing keeps working.

## Agent control lock

The agent can lock the browser while it runs a multi-step workflow so the user and the agent do not change the same state at once. It works like a mutex the agent holds.

- **Tools:** MCP exposes `take_control` and `release_control`. Their descriptions tell the agent to take control only for workflows of several steps. Single tool calls such as `set_region` never lock.
- **Scope:** while the agent holds control, the user cannot make changes to browser state: navigation, tracks, regions, settings, and features built on that state. Read-only interaction such as scrolling, hovering, and tooltips still works. The Stop button always works, and the image export dialog stays usable.
- **Release:** control is released when the agent calls `release_control` or when the run ends for any reason: completion, error, Stop, cancellation, or tab disconnect. A lock cannot outlive its run.
- **Appearance:** a subtle tint over the browser. Revisit after real use.

The lock lives in the app as its own deep module, with `take_control` and `release_control` defined as app MCP commands next to the existing ones. It does not change `packages/core`. Agent commands and user actions call the same store actions, so the app blocks the user's controls while the lock is held instead of gating the stores, and the agent's commands keep working. Design the module with the architecture-design skill before building it. The lock is separable: if it proves complicated, it ships as a follow-up without blocking the rest of this PRD.

## Multiple tabs

Multi-tab behavior is deferred. The relay is currently first-tab-wins: a second tab trying to attach to the same session is refused with `409 TAKEN`. See [relay.ts](../../apps/web/features/agent/server/relay.ts) and [http.ts](../../apps/web/features/agent/server/http.ts).

## Later

Features that came up while defining this PRD and were deliberately left out. The agent's tool list belongs to [MVP scope](mvp.md#the-integrated-agent), not this list.

- Guest agent experience, possibly an ephemeral chat that resets with the browser.
- Runs that keep working on a session with no open tab, which requires server-side session state.
- Queuing or steering messages while a run is in progress.
- Undo for agent actions.
- Carrying a summary into a new conversation, or remembering earlier conversations of a session.
- Bringing the agent's conversation into a session copy.
- Tuning compaction beyond Eve's defaults.
- Newest-tab takeover and other multi-tab behavior.
- Usage limits per user or per session.
- Refining the control lock's appearance.

## Decisions left for implementation

- The tab reattach grace period before a run is cancelled.
- How the app blocks user controls while the lock is held, decided in the lock module's design.

[Back to app direction](README.md)
