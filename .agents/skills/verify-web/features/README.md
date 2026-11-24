# `@weng-lab/web` verification map

This directory is the maintained source for verifying the user-facing behavior of `@weng-lab/web`. Read this index before driving the app, then follow the matching feature file as the recipe.

## Baseline preconditions

- Launch `@weng-lab/web` on `localhost` with `.agents/skills/verify-web/scripts/verify-web.mjs launch`.
- Let `launch` apply pending Drizzle migrations (`pnpm web db:migrate`) and authenticate the isolated `agent-browser` session as the dedicated Clerk dev test user (`verify-web+clerk_test@example.com`).
- Run `.agents/skills/verify-web/scripts/verify-web.mjs doctor` and require `healthy: true` with `mode: "signed-in"` (or `mode: "signed-out"` when explicitly testing signed-out flows).
- Never drive a server instance that was not started by this verification run.

## Driving conventions

- Start every recipe from the baseline state unless its `Preconditions:` say otherwise.
- Prefer ARIA roles and accessible names (`find role <role> <action> --name "<label>"`), `find label` / `find placeholder`, or fresh `snapshot -i` `@ref` handles over CSS selectors or DOM positions. Omit `--exact` on standard buttons whose visible label may be uppercased or include a leading icon space; keep `--exact` on explicit `aria-label` icon buttons.
- Wait on observable UI state (`All changes saved`, visible dialog title, URL transition, absent loading spinners via `!document.querySelector('[role="progressbar"], svg animateTransform[type="rotate"]')`) instead of fixed sleeps.
- Run all browser commands through `.agents/skills/verify-web/scripts/verify-web.mjs browser ...`.
- Save all proof artifacts through `verify-web.mjs screenshot`, `snapshot`, or `record` so they land in `/tmp/gb-verify-evidence/<runId>/` and survive `cleanup`.
- Clean up after every run (including failed runs) with `.agents/skills/verify-web/scripts/verify-web.mjs cleanup`.

## Keeping the map honest and reporting feedback

- This map reflects the **product** from the user's point of view, never internal code. Whenever a user-facing feature is added, changed, or removed in `@weng-lab/web`, update this index and the matching feature file in the same change.
- Whenever driving the app surfaces a hurdle, broken flow, missing accessible handle, or harness gap, check open issues first and suggest filing a GitHub issue (with reproduction steps, evidence, and the `agent-dx` label for harness/agent friction) at handoff so the feedback is tracked.

## Proof and skip reporting

- Capture both the user action (or before state) and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a PNG screenshot (or `.webm` recording for multi-step flows) showing the app workspace and resulting state.
- Mutation proof includes a read-only second view of the persisted value (reload the page, navigate to `/sessions`, or inspect the reopen result).
- Check `.agents/skills/verify-web/scripts/verify-web.mjs browser errors` before finishing and report any page errors.
- Report any unreachable path with the attempted command and exact unmet precondition (for example, Redis unavailable for Remote Control or an unreachable external genomic file host).
- Never report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order:

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-web` starts with `Preconditions:` and uses labeled bullets pairing each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Sessions](./sessions.md) covers creating, opening, switching, inline renaming, copying, searching, and deleting saved sessions.
- [Browser navigation and image export](./browser-navigation.md) covers coordinate search, pan/zoom controls, track sorting, and SVG/PNG download.
- [Saved regions and groups](./saved-regions.md) covers saving the current view or custom coordinates, jumping to regions, grouping, hiding, and deleting regions.
- [Add custom tracks](./add-tracks.md) covers pasting, reviewing, validating, and adding hosted BigWig, BigBed, BigGenePred, and BAM tracks.
- [Settings and MCP remote control](./remote-control.md) covers toggling Remote Control, checking AI Assist connection status, and verifying `/api/mcp` command execution.
