# 0001. The browser tab owns the genome browser state

Decided 2026-10-01.

## Why this came up

Agents need to read and change what the genome browser shows. The genome browser keeps its state in Zustand stores in the page, and its store actions already validate every change.

## What we chose

The browser tab is the authority for live state. Every change, from a button or an agent, runs in the tab through the library's store actions. The server stores saved snapshots but never a live copy.

## Other options

- **Server-authoritative state.** The server would hold the state and push it to tabs. Agents could act with no tab open, but we would have to run the genome browser's validation on the server and keep two copies in step.
- **Shared state through a sync service.** More moving parts than the app needs, and it still needs a single authority.

## What this means

- The library's own validation decides what is allowed, in one place.
- Agent commands fail when no tab is open. The tool returns a link to open the session.
- The server needs a way to reach tabs (see [0003](0003-sse-for-tab-connections.md)).
- Running simple commands against saved state without a tab stays possible later.
