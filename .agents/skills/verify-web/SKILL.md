---
name: verify-web
description: Drive, screenshot, record, and verify @weng-lab/web (the Next.js genome browser workspace and its Vite design gallery) like a real user. Use whenever verifying UI or behavior changes in apps/web, capturing before/after screenshots or videos for PRs and bug reports, testing sessions/browser/regions/custom-tracks/remote-control/agent-chat flows live, or diagnosing visual/interactive regressions.
---

# Verify `@weng-lab/web`

Drive the real Next.js application (`@weng-lab/web`) through an isolated `agent-browser` session backed by local PostgreSQL, Redis, and a dedicated Clerk dev test account (`verify-web+clerk_test@example.com`). Read the [feature map](features/README.md) before driving a feature.

This skill complements static verification ([verify](../../../docs/contributing/verify.md)): use `pnpm format`, `pnpm verify`, and `pnpm run doctor` for code checks, and `verify-web` to prove live UI and interactive behavior with screenshots, recordings, ARIA snapshots, and persistence checks.

## Launch

Prerequisites (from the repository root):

- `apps/web/.env.local` has `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` configured for the Clerk dev instance (see [apps/web/README.md](../../../apps/web/README.md)).
- PostgreSQL (`127.0.0.1:5432`) is running (`pnpm web db:start` if Docker is available; otherwise verify it is already listening). Redis (`127.0.0.1:6379`) is needed only for Remote Control / `/api/mcp`.
- `agent-browser` is on `PATH`.

Launch an authenticated verification instance (runs `pnpm web db:migrate` so an empty database is ready, starts Next.js on `http://localhost:3099` with an isolated Redis namespace, creates or finds the dedicated Clerk test user `verify-web+clerk_test@example.com`, signs in via a Clerk Backend API sign-in token, and lands on `/browser` at `1440x900`):

```sh
.agents/skills/verify-web/scripts/verify-web.mjs launch
```

Ready signal: the command prints JSON containing `runId`, `baseUrl`, `browserSession`, `clerkUserId`, and `evidenceDir` and exits `0`. By then, `http://localhost:<port>/browser` has returned HTTP 200, the Clerk session is hydrated, and the `Account` button is present in the sidebar.

Other launch modes:

- **Signed-out flows:** `.agents/skills/verify-web/scripts/verify-web.mjs launch --signed-out` (opens `/browser` without signing in and waits for `Sign in to open and save sessions.`).
- **Design gallery (`apps/web/shared/ui` without DB or Clerk):** `.agents/skills/verify-web/scripts/verify-web.mjs launch --design` (starts Vite at `http://localhost:3109` and waits for the `Design` heading).
- **Custom port, viewport, or run ID:** `--port 3098 --viewport 1280x800 --run-id my-check` (override the Clerk test user with `GB_VERIFY_CLERK_USER_ID` or `GB_VERIFY_CLERK_EMAIL`).

Isolation rules:

- Always connect through `localhost`, never `127.0.0.1` — Clerk rejects `127.0.0.1` request URLs.
- `launch` refuses to start if the chosen port is already occupied. Do not double-drive a user's running `pnpm dev` server.
- Next.js holds `apps/web/.next/dev/lock` per checkout, so only one `next dev` process can run in the same checkout at a time. Run verification serially in one checkout, or use a separate worktree.
- The local `genomebrowser` Postgres database is reused, isolated by user identity (`verify-web+clerk_test@example.com`). `launch` records any pre-existing sessions for that user so `cleanup` deletes only sessions created during the run.

## Doctor

Run one read-only check before driving a feature and whenever anything looks off (unexpected redirect, blank panel, stalled save):

```sh
.agents/skills/verify-web/scripts/verify-web.mjs doctor
```

`doctor` verifies:

1. The server PID started by this run is still alive (`server_pid`).
2. `<baseUrl>/browser` (or `<baseUrl>` in `--design` mode) responds HTTP 200 (`http_ready`).
3. PostgreSQL is reachable (`postgres`), and reports whether Redis answers `PING` (`redis`, advisory unless testing Remote Control / MCP).
4. Current `git rev-parse --short HEAD` matches the revision at launch (`git_head`).
5. The isolated `agent-browser` session is alive on `<baseUrl>` (`browser_session`).
6. `/api/sessions` returns HTTP 200 when `signed-in`, or HTTP 401 when `signed-out` (`auth`).

If `doctor` fails, do not keep driving. Inspect `/tmp/gb-verify-<runId>/server.log`, run `cleanup`, fix the cause, and re-launch.

## Drive

Run all browser interactions through the helper's `browser` subcommand so every call targets this run's isolated `agent-browser` session:

```sh
.agents/skills/verify-web/scripts/verify-web.mjs browser snapshot -i
.agents/skills/verify-web/scripts/verify-web.mjs browser find role button click --name "Sessions" --exact
.agents/skills/verify-web/scripts/verify-web.mjs browser find role button click --name "Add tracks"
.agents/skills/verify-web/scripts/verify-web.mjs browser find label "Name" fill "Demo session"
.agents/skills/verify-web/scripts/verify-web.mjs browser wait --text "All changes saved"
.agents/skills/verify-web/scripts/verify-web.mjs browser errors
.agents/skills/verify-web/scripts/verify-web.mjs browser console
```

Driving rules:

- Prefer ARIA roles and accessible names (`find role ... --name ...`), `find label` / `find placeholder`, or `@ref` handles from a fresh `snapshot -i` over CSS selectors, DOM order, or pixel coordinates.
- Omit `--exact` on standard text buttons (MUI applies uppercase text-transform and prepends a leading space for leading icons, e.g., `"CREATE"`, `" Sort tracks"`, `" NEW SESSION"`). Use `--exact` for icon-button `aria-label`s like `"Sessions"` or `"Actions for session <name>"`.
- Wait on observable UI state rather than fixed sleeps: wait for `All changes saved` after mutations, wait for `!document.querySelector('[role="progressbar"], svg animateTransform[type="rotate"]')` before capturing track screenshots or triggering image exports, and wait for the URL to contain `/browser/` after creating or opening a session.
- Use the mapped recipes in [features/README.md](features/README.md) rather than inventing shortcuts. Never mutate internal app state directly or hit test-only shortcuts to prove a user-facing change.
- For `/api/mcp` remote-control verification, fetch a short-lived Clerk Bearer token from the active browser session with `verify-web.mjs mcp-token` (never write the token to evidence files or logs).

## Evidence

Proof artifacts are stored under `/tmp/gb-verify-evidence/<runId>/` — outside the runtime scratch directory (`/tmp/gb-verify-<runId>/`) so `cleanup` never deletes them.

Capture commands:

```sh
# PNG screenshot (prints absolute path)
.agents/skills/verify-web/scripts/verify-web.mjs screenshot sessions/created
.agents/skills/verify-web/scripts/verify-web.mjs screenshot browser/full-view --full

# Interactive ARIA snapshot (.aria.txt)
.agents/skills/verify-web/scripts/verify-web.mjs snapshot sessions/created

# Multi-step video recording (.webm)
.agents/skills/verify-web/scripts/verify-web.mjs record start regions/group-flow
# ... drive the steps ...
.agents/skills/verify-web/scripts/verify-web.mjs record stop

# List captured artifacts for the active run
.agents/skills/verify-web/scripts/verify-web.mjs evidence
```

Proof standards (aligned with [docs/contributing/verify.md](../../../docs/contributing/verify.md)):

- **Exercise the real user path:** click real controls, fill real forms, and wait for real saves/renders.
- **Capture action and resulting state:** for visual bug fixes or state changes, capture before and after screenshots (plus ARIA snapshot where text/roles matter). For multi-step flows, capture a `.webm` recording.
- **Verify side effects independently:** after saving or mutating a session, region, or setting, reload the page or reopen it from a second view (`/sessions`, another route, or `GET /api/sessions`) and confirm the persisted state matches.
- **Check runtime health:** run `verify-web.mjs browser errors` before finishing and report any unexpected console or page errors.
- **Report skipped or blocked paths honestly:** if a precondition (such as Redis for Remote Control, or external track host reachability) is unmet, report the attempted command and exact unmet precondition rather than weakening the check.

## Cleanup

Always run cleanup at the end of a run — including after failed iterations — so no server process, port, browser daemon, or stray verification session is left behind:

```sh
.agents/skills/verify-web/scripts/verify-web.mjs cleanup
```

What `cleanup` does:

1. Calls `DELETE /api/sessions/<id>` for every session created during this run (pass `--all-verify-sessions` to clear orphaned sessions from earlier crashed runs of the verify test user). Never touches any other user's sessions.
2. Closes only this run's `agent-browser` session (`--session gb-verify-<runId>`).
3. Sends `SIGTERM` (then `SIGKILL` after 5s) only to the process group started by `launch`. Never kills by process name.
4. Deletes `/tmp/gb-verify-<runId>/` runtime scratch state.
5. **Preserves `/tmp/gb-verify-evidence/<runId>/`** and prints the surviving artifact paths and byte sizes. Confirm your proof files appear in that output.

## Helpers

All commands live in [scripts/verify-web.mjs](scripts/verify-web.mjs) (executable Node.js ESM, zero extra dependencies):

| Command                                                                                             | Purpose                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `launch [--port <n>] [--run-id <id>] [--signed-out] [--design] [--skip-migrate] [--viewport <WxH>]` | Run migrations (unless `--design` or `--skip-migrate`), start the app on `localhost`, open an isolated `agent-browser` session, and sign in via Clerk dev token. |
| `doctor [--run-id <id>]`                                                                            | Read-only check of PID, HTTP readiness, Postgres/Redis, `git HEAD`, browser session, and auth state.                                                             |
| `browser [--run-id <id>] [--] <args...>`                                                            | Forward any `agent-browser` command to this run's isolated session.                                                                                              |
| `screenshot [--run-id <id>] <name> [--full] [--annotate]`                                           | Save a PNG screenshot to `/tmp/gb-verify-evidence/<runId>/<name>.png`.                                                                                           |
| `snapshot [--run-id <id>] <name> [--full]`                                                          | Save an ARIA tree snapshot to `/tmp/gb-verify-evidence/<runId>/<name>.aria.txt`.                                                                                 |
| `record [--run-id <id>] start <name> \| stop`                                                       | Start or stop a `.webm` video recording in `/tmp/gb-verify-evidence/<runId>/`.                                                                                   |
| `mcp-token [--run-id <id>]`                                                                         | Print a short-lived Clerk Bearer token from the active browser session for `/api/mcp`.                                                                           |
| `evidence [--run-id <id>]`                                                                          | List all proof artifacts captured in the current run's evidence directory.                                                                                       |
| `cleanup [--run-id <id>] [--all-verify-sessions]`                                                   | Delete verification sessions created during the run, close the browser, stop the server, delete scratch state, and keep evidence.                                |

## Feature map & upkeep

Read [features/README.md](features/README.md) for baseline preconditions, driving conventions, and per-feature verification recipes.

Keep this skill aligned with the **product**, not internal code:

- **Update automatically with product changes:** whenever a user-facing feature in `@weng-lab/web` is added, changed, or removed, update the matching file in `features/` (and `features/README.md`) in the same change. Describe what users see and do, not implementation details.
- **Suggest GitHub issues for feedback:** whenever you hit a failure, hurdle, flaky wait, awkward flow, or missing harness capability while driving the app, check open issues first and suggest filing a GitHub issue (with the `agent-dx` label for harness/agent friction, following [github-contribution](../github-contribution/SKILL.md)) at handoff so both the product and this verification skill keep improving.
