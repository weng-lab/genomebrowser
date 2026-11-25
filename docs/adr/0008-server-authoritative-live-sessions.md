# ADR 0008: Server-authoritative live sessions with Redis pub/sub

- Status: accepted
- Date: 2026-11-24
- Amends: [ADR 0007](0007-app-owned-mcp-redis-relay.md)

## Context

Under [ADR 0007](0007-app-owned-mcp-redis-relay.md), each web client owned its live session state and autosaved whole snapshots to PostgreSQL, while Redis only relayed MCP commands to one leased web client. That caused two recurring problems:

1. Two web clients open on the same session hit `409 CONFLICT` on save and `409 TAKEN` on remote control instead of staying in sync.
2. Pure state MCP commands (`set_region`, `list_tracks`, `sort_tracks`, `set_track_metadata`) failed with `NOT_CONNECTED` whenever no web client had the session open, blocking background or headless agent workflows.

## Decision

- **PostgreSQL is the sole read/write store** for session state and revision ordering. Every read (`GET`) and mutation (`PUT`, `PATCH`, MCP state commands) hits PostgreSQL directly; Redis does not keep a second copy of session state.
- **`SessionService` owns live session reads and mutations** for both web clients (`PATCH /api/sessions/[id]`) and pure state MCP tools. Concurrent edits merge on the server via conditional revision retries (up to 4 attempts) and idempotent `saveId` deduplication.
- **Injectable `SessionBus` fans out lightweight pub/sub events** (`{ type: "updated", revision, sourceClientId? }` hints and `{ type: "deleted", sessionId }` notices) over SSE (`GET /api/sessions/[id]/events?sinceRevision=...`):
  - Production and previews use Redis pub/sub, sharing one publisher/subscriber connection pair per server instance with the command relay.
  - Local development without `REDIS_URL` and unit tests use an in-memory `SessionBus` with zero external services.
  - Clients treat `updated` events as hints: if `sourceClientId !== clientId` and `revision` is newer than local state, the client runs a coalesced `GET /api/sessions/[id]` fetch. Reconnecting streams pass `?sinceRevision=` so missed updates catch up without losing events across serverless stream cutoffs or Redis disconnects.
- **Viewport (`browser.region`) is read from server state, not autosaved by tabs**:
  - Opening a session restores the saved `browser.region` from PostgreSQL as it is.
  - Local panning and zooming update only the tab's local Zustand store—they never send `PATCH`es, never rewrite Postgres JSONB rows on pan, and never fight across open tabs.
  - Explicit server-side region changes (such as MCP `set_region`) bump the session revision and change `snapshot.browser.region`; open tabs detect that the server's `region` changed and jump to it, while remote updates to other sections leave each tab's local viewport intact.
- **Web clients stay optimistic and snappy**: Zustand stores remain local and synchronous; `autosave.ts` debounces section patches, rebases unacknowledged local edits onto incoming remote snapshots, suppresses echoes, preserves unchanged track object references, and ignores renderer-derived height differences so clients at different viewport widths do not ping-pong.
- **Browser-only MCP tools** (`export_image`, `add_tracks_from_urls`) continue to use the Redis command relay from [ADR 0007](0007-app-owned-mcp-redis-relay.md) because they depend on DOM SVG rendering or browser-side CORS checks.

## Merge rules by section

`PATCH /api/sessions/[id]` sends only the sections that changed since the tab's last acknowledged revision (`diffSessionPatch`). When two edits touch different sections, both survive; when two edits touch the same merge unit concurrently, the later commit wins (last-write-wins at that unit's granularity).

| Section / field | Merge unit | Client autosave | Notes |
| --- | --- | --- | --- |
| `name` | Whole field | Yes | Independent of `snapshot`. |
| `browser.region` | Whole field | No (read-only in tab) | Restored on open; updated live when changed on the server (e.g. MCP `set_region`). |
| `browser.basePairDetail`, `marginWidth`, `trackWidth`, `fontSize`, `titleSize`, `selectionMode`, `selectionHighlight` | Per field | Yes | Individual browser settings merge independently. |
| `browser.highlights` | Whole array | Yes | Normalized together with `regionGroups` on commit. |
| `tracks` | Whole array | Yes | Order, additions, removals, configs, and metadata commit together; renderer-derived `base.height` is ignored for sync. |
| `pinnedTrackIds` | Whole array | Yes | Independent of `tracks` metadata/config edits. |
| `regionGroups` | Whole array | Yes | Normalized against `browser.highlights` whenever either changes. |

## Consequences

Multiple web clients on one session stay in sync live without conflicts or viewport tug-of-war, and state MCP tools work with `0..N` open web clients. Redis stays ephemeral and tiny (pub/sub hints only, no cached snapshots). `packages/core` remains unaware of server sync and persistence.
