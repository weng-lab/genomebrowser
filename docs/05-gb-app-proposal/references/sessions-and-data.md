# Sessions and data

Part of the [architecture](README.md). Decisions: [0001](decisions/0001-browser-tab-owns-state.md), [0006](decisions/0006-sqlite-locally-postgres-cloud.md).

## Purpose

What gets saved, how live tabs relate to saved sessions, and how data is stored locally and cloud.

## Browser sessions and tabs

- A **browser session** is a saved workspace in the database. It holds the region, tracks, highlights, a name and an `mcp_enabled` flag.
- A **tab** is a live connection that has a session open. It registers as "tab X showing session Y".
- Commands target a session. The server delivers each one to that session's most recently focused tab.
- After each change, the tab saves the new state to the server and broadcasts it to the session's other tabs.
- If a session has no open tab, a tool returns an error with a link to open it.

The saved state is a snapshot. The live state is always in the tab (see [decision 0001](decisions/0001-browser-tab-owns-state.md)).

## Database

SQLite locally and Postgres cloud, both through Drizzle. That means two schema files (`sqlite-core` and `pg-core`) and two sets of migrations. We accept that to keep the CLI small.

- **Local:** `node:sqlite`, the SQLite built into Node. It adds nothing to the package. Drizzle's stable release has no driver for it, so a small adapter connects it through Drizzle's `sqlite-proxy` driver.
- **Cloud:** Cloud SQL Postgres through `node-postgres`.

Keeping both schemas in step:

- Use only column types both databases have. Store session state as JSON text in SQLite and `jsonb` in Postgres.
- Put queries behind the session-store interface, so server code never imports a dialect-specific helper.
- Generate migrations for both databases in the same change.
- Run the same tests against both.

## Tables

| Table | Contents | Where |
| --- | --- | --- |
| `users` | Users. Locally, one built-in user. | Both |
| `browser_sessions` | id (UUID), user_id, name, state (JSON with region, tracks and highlights), mcp_enabled, updated_at | Both |
| `agent_threads` | session_id, provider, external id such as the Eve conversation id | Both |
| `agent_permissions` | user, agent or client, session (or all sessions), mode, per-tool overrides | Both |
| `local_files` | id, allowed folder, path inside it, size, modification time, detected type. See [local-files.md](local-files.md) | Local |
| `audit_log` | user, agent or client, command, session, time, and how the call was decided (allowed by rule, approved by the user, or denied) | Both |
| `mcp_grants` | OAuth clients and tokens for MCP clients | Cloud |
| `device_grants` | Pending device codes and connected `gb` devices with their refresh tokens | Cloud |
| Auth library tables | Accounts, linked sign-in methods, login sessions, managed by Better Auth | Cloud |

## Local and cloud sessions

Initially, local and cloud sessions are separate. Local `gb` does not sign in to the cloud or open cloud sessions. Every browser session has a home:

- A **local session** lives in the SQLite database of the `gb` that created it.
- A **cloud session** lives in cloud Postgres. Initially, only the cloud site opens it. Access from a signed-in `gb` comes later.

Local files make this hard. A track that points at `signal/H3K27ac.bw` on a lab server can't load on the cloud site, which has no access to that disk.

Later proposal, to be settled before adding cross-environment access:

- Sessions can be copied from local to cloud with an explicit "Save to cloud".
- Tracks backed by local files are kept as references, not uploaded.
- Wherever such a track can't load, the workspace shows it as a placeholder with its name, its settings and where the file lives ("on lab-workstation"), and keeps it in the session.
- Nothing uploads automatically.

## Cloud sessions in the CLI

This is a later feature, after both versions work independently. Before building it, resolve missing local files and simultaneous changes from local and cloud tabs.

After the user signs in from the local app (see [identity-and-security.md](identity-and-security.md#local-sign-in-device-flow)):

- `remoteStore` implements the session-store interface as an HTTP client of the cloud API. The workspace lists local and cloud sessions together.
- There is no syncing. The cloud copy stays the only copy, and the local server reads and saves it through the cloud API.
- Agent control stays local: the tab still connects to the local server, so local agents can drive a cloud session.
- When signed out or offline, local sessions keep working and cloud sessions are unavailable.

Groundwork that has to exist from the start, even before cloud exists:

- globally unique session ids
- the same session JSON in both databases
- session storage behind an interface
- version the cloud API when cloud access is introduced

## Risks

- **`node:sqlite` is still marked as under development in Node.** Keep all direct calls in the one adapter file, and test on each Node version the CLI supports.
- **Schema drift.** A column added to Postgres but not SQLite breaks one deployment silently.
- **One server per database file.** Two `gb` servers writing the same file would fight over locks and each hold different tabs. The CLI reuses an already-running `gb` instead (see [local-cli.md](local-cli.md)).
- **Migrations on user machines.** Each CLI upgrade migrates the user's database on startup. Test upgrades from older versions, not just fresh installs.
- **Session state is private.** Private track URLs often contain access tokens. Don't log full session state.

## Future options

- **Move sessions between local and cloud.** Session state is plain JSON, so `gb export` on one side and an import on the other moves it.
- **Fast database tests.** SQLite runs in memory (`:memory:`), so local-profile tests need no setup.
- **Save sessions in the browser** for anonymous cloud use, in IndexedDB or SQLite's official WebAssembly build with browser file storage (OPFS).
- **Run commands without an open tab.** Apply simple commands to the saved state on the server using the library's plain validation functions, such as `normalizeRegion`.
- **Switch to PGlite** if two schemas become too much work. See [decision 0006](decisions/0006-sqlite-locally-postgres-cloud.md).
## Open questions

Each question has a default. Build with the default unless it changes.

### SD-1. Can a cloud session contain tracks backed by local files?

- **Yes, as references that only load where the file exists (default).** Users keep one session across machines. The cloud site shows placeholders.
- **No.** Saving to cloud is blocked, or those tracks are dropped. Clear, but users lose work or are stuck with local-only sessions.
- **Only after the file is uploaded** (see SD-3).

### SD-2. What does the cloud site show for a local-file track?

- **A placeholder (default)** with the file name, size, the machine it lives on, and its settings kept.
- **Hide it** until the session is opened where the file exists.
- **Remove it** from the session. Simple, but destroys the user's work.
- **An error** in the track. Accurate, but looks broken.

### SD-3. Upload local files to a cloud bucket?

Uploading would let the cloud site and collaborators see the data. Concerns:

- Files are often several gigabytes, which costs storage and bandwidth.
- Unpublished data is private.
- Controlled-access human data (for example, data under dbGaP agreements) often may not leave approved machines. Automatic uploading could break a user's data use agreement.

Options:

- **Never upload; references only.**
- **Explicit per-track upload, later (default).** A "Upload to cloud" action with a size limit, a quota and a clear warning. Never automatic.
- **Temporary upload with an expiry,** for sharing a view briefly.
- **Automatic upload on save to cloud.** Rejected because of the data-agreement risk.

### SD-4. Stream files from the user's running `gb` when it is online?

The cloud site could read a local file through the user's own `gb`, if that `gb` is running and connected (through the cloud relay in [remote-access.md](remote-access.md#later-a-cloud-relay)). The data never lands in our storage.

- **Later, together with the relay (default).**
- **Never.** Keeps the cloud site out of users' machines entirely.

### SD-5. Copy or move between local and cloud?

- **Copy (default).** "Save to cloud" creates a cloud session, and the local one stays. Two sessions can then diverge.
- **Move.** One authoritative session, but the local copy disappears, which surprises users who work offline.
- The copy stores the id of the session it came from. No "update the cloud copy" feature yet (default).

### SD-6. Which machine's file does a cloud session use?

If a cloud session is opened by `gb` on a laptop and by `gb` on a server, each resolves local-file tracks against its own disk. With relative paths (see [LF-2](local-files.md#lf-2-how-does-the-server-identify-a-file)), the same session works on both when both have the project.

- **Record the machine name each time a file loads, so a placeholder can say "available on lab-workstation" (default).**
- Don't record machines. Placeholders only say the file isn't here.
