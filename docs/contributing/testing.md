# Testing

A test guards behavior against later changes. Keep one only when it catches real breaks cheaply.

## Decide on every change

State the decision and its reason in one line in the PR, such as "No test: copy change only" or "Test: BigWig render snapshot, catches lost negative values". Skip tests that would only restate the change (a constant, copy, a style) or need elaborate mocking.

## The two-edit check

Keep a test only if it fails when you **break the behavior** (wrong value, skipped effect, done twice) and passes when you **change only the internals**. Before finalizing a new test, break the behavior on purpose to confirm it fails with the expected wrong value, then restore the code. That rules out tests that restate the code or a style constant, and `toHaveBeenCalled` on first-party helpers. Calls handed to consumers, sent to other services, or crossing a package boundary are contract and may be asserted.

## Where tests call in

| Package    | Call in through                                                             | Assert                                      |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `reader`   | Public reader API on fixture files over HTTP range requests, public parsers | Decoded records, parsed and rejected input  |
| `core`     | Mounted `GenomeBrowser`, documented store operations, the module contract   | Rendered output, store state, callbacks     |
| `tracks`   | The module mounted in `GenomeBrowser` with a fixture, through `mountTrack`  | SVG snapshot, tooltip text, setting effects |
| `ui`       | The user workflow on the component                                          | Screen content or browser store state       |
| `apps/web` | Routes and persistence with real Postgres and Redis; the MCP endpoint       | Responses, stored sessions, tool results    |
| `apps/web` | The client session lifecycle against a contract-correct session server      | Saved state, conflicts, rendered data       |
| `create`   | The executable in a temporary directory                                     | Generated files, exit code, output          |

Keep everything between input and outcome real; fake only at an explicit boundary outside the behavior under test. When behavior is hard to reach from its interface, improve the interface instead of adding test-only exports or switches. Expected values come from the requirement, never from a run of the code.

## Track render snapshots

Each track and user-selectable display mode has one SVG snapshot: mount it with a fixed fixture, region, and width, export with `exportBrowserImage(svg, "svg")`, and compare with `toMatchFileSnapshot` against a `.svg` file. When one changes, open both images and update only for an intended visual change; say which in the PR. Remove recurring noise in the shared export helper, not per test. Assert values users read, such as tooltip text, separately. Do not snapshot React trees, store state, or geometry.

## Other kinds

- **Browser tests:** only when correctness depends on layout, hit testing, focus, scrolling, or APIs jsdom lacks. A shipped epic's user workflow becomes one browser journey.
- **Private code:** only for a correctness or performance risk public tests cannot reach, such as gene geometry or binary decoding. Name the risk in a one-line suite comment.
- **Render budgets** (`*.renders.test.tsx`) measure performance, not behavior; the rules above do not apply. Use the verify-renders skill.

When a refactor breaks a test and supported behavior did not change, delete the test or move it to the boundary.
