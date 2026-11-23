# Agent panel PRD: threads, runs, and control

This PRD defines the fundamental behavior of the integrated agent panel for production: how conversations persist, what the agent knows, how runs start and stop, and how the agent and the user share the browser. [MVP scope](mvp.md), [agent access](agent-auth.md), and [sessions](sessions.md) link here for these topics, and [limitations](limitations.md#agent-panel) records how far the current code is from this intent.

The goal is a small, reliable foundation. Anything not needed for the agent to work correctly is listed under [later](#later) instead of being built now.

## Scope

The agent is for signed-in users only. Guests see no agent panel; a guest agent experience is designed separately later.

The agent stays a control surface for the open session. It operates the browser through MCP tools sent to the tab that holds the session. It does not research independently or keep memory across sessions.

## Threads

Each saved session has one agent thread at a time, keyed on the session ID. Opening a session, on any device or after a reload, loads that session's current thread and its messages. The panel never shows another session's thread.

A thread rolls over into a new one in two cases:

- **Inactivity.** No turn has ended for 3 hours. The check is lazy: it runs when the user next opens the session's panel or sends a message, not on a timer.
- **New conversation.** The user presses the panel's "New conversation" button. This uses the same rollover path immediately.

Rollover never happens while a run is in progress. The 3-hour window is a config value.

On rollover, the app summarizes the ending thread, stores the summary, ends the old Eve session, and starts a new one with the summary in its instructions. The panel clears and shows a subtle "previous context loaded" indicator. The user cannot read the old thread's messages afterward; only the summary survives.

Long active threads need no rollover of their own. Eve 1.3 compacts history automatically when a thread reaches 90% of the model's context window.

### Summaries

The app writes a summary once per thread, at rollover. It does not update summaries after each message.

The stored summary is one short document per session with two parts:

- **Session history:** a high-level account of everything before the latest thread. Each rollover rewrites it to stay under about 2,500 words, compressing or dropping the oldest details first.
- **Latest thread:** a somewhat more detailed account of the thread that just ended.

The summary states that the browser may have changed since it was written, so the agent checks current state with its tools instead of trusting remembered regions or tracks.

Summarizing is invisible to the user. If it fails, the error is logged and the new thread starts from the previous stored summary.

### Storage and Eve retention

Postgres stores, per session: the current Eve session ID, the time the last turn ended, and the summary. It never stores full transcripts.

Private Eve sessions outside development use zero retention: Eve keeps messages while a session is active and deletes them when it ends. The 3-hour rollover is therefore the app's rule, not Eve's `sessionTimeoutMs`. Eve's idle timeout stays at its 30-day default, far longer, so the old thread is still readable when the app summarizes it. If a user returns after Eve has already ended the session, the latest thread is lost and the new thread starts from the stored summary alone.

The current conversation access binding in Redis expires after 24 hours ([conversationAccess.ts](../../apps/web/features/agent/server/conversationAccess.ts)). Persistent threads need that ownership check to follow the session's lifetime instead.

### Session operations

- **Delete:** deleting a session deletes its summary and thread record and ends its Eve session.
- **Save a copy:** the copy dialog offers a choice: copy agent history or start fresh. Copying gives the new session its own thread, keyed on the new session ID, seeded with the original's summary plus a summary of the original's current thread. The original session's thread is unchanged.
- **Switch session:** the panel loads the new session's thread. See [runs](#runs) for what happens to work in progress.

## What the agent knows

The app adds a few facts to the agent's instructions, rather than seeding them as conversation history. It reads them again before each message, so a renamed session or edited preferences apply from the next message on:

- The session ID, assembly, such as hg38, and session title.
- The stored summary, when one exists. It changes only at rollover.
- The user's preferences text.

Preferences are a free-text field on the settings page, about 1,000 characters at most, that works like an `AGENTS.md` for the user: tone, defaults, habits. They apply to every session. Preferences are never folded into summaries.

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
- Smarter compaction and summaries beyond Eve's defaults and the two-part summary.
- Reading previous threads' full transcripts.
- Newest-tab takeover and other multi-tab behavior.
- Usage limits per user or per session.
- Refining the control lock's appearance.

## Decisions left for implementation

- The tab reattach grace period before a run is cancelled.
- How the app blocks user controls while the lock is held, decided in the lock module's design.

[Back to app direction](README.md)
