# Testing

A test guards against behavior breaking later. It does not prove a change works; running the change on the real surface does. Keep a test only when it catches real breaks cheaply.

## Decide on every change

Decide whether each change gets a test and give the reason in one line in the PR, such as "No test: copy change only" or "Test: BigWig render snapshot, catches lost negative values".

Write a test when it fails on broken code for the right reason, asserts what a user or caller sees (rendered SVG, store state, a payload, a return value, an error type callers branch on), and costs less to set up than the protection it gives. Skip it when it would only restate the change (a constant, copy, a style), duplicate existing coverage, or need elaborate mocking; say what you checked instead. Prefer one or two tests that pin the behavior over many small cases.

## The two-edit check

Judge every test you write, keep, or review by two imagined edits:

1. **Break the behavior.** Return a wrong value, skip an effect, or do it twice. If the test still passes, it proves nothing.
2. **Change only the internals.** Keep every observable result and restructure underneath. If the test now fails, it is pinned to the implementation.

Keep tests that fail the first edit and survive the second. These fail it:

- **Restating the code**, or what the type system already guarantees.
- **Restating a style or constant**, such as a `12px` gap. A default the package docs promise, such as a track's default height, is behavior.
- **Asserting an internal call** with `toHaveBeenCalled` on a first-party helper. A callback handed to a consumer, a request to another service, or a call across a package boundary is contract and stays.

## Where tests call in

Call in through the smallest interface consumers use and keep everything between input and outcome real:

| Package    | Call in through                                                             | Assert                                      |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `reader`   | Public reader API on fixture files over HTTP range requests, public parsers | Decoded records, parsed and rejected input  |
| `core`     | Mounted `GenomeBrowser`, documented store operations, the module contract   | Rendered output, store state, callbacks     |
| `tracks`   | The module mounted in `GenomeBrowser` with a fixture, through `mountTrack`  | SVG snapshot, tooltip text, setting effects |
| `ui`       | The user workflow on the component                                          | Screen content or browser store state       |
| `apps/web` | Routes and persistence with real Postgres and Redis; the MCP endpoint       | Responses, stored sessions, tool results    |
| `apps/web` | The client session lifecycle against a contract-correct session server      | Saved state, conflicts, rendered data       |
| `create`   | The executable in a temporary directory                                     | Generated files, exit code, output          |

Serve remote data from fixture files, replace auth providers with a test server, and control time with fake timers. A contract-correct fake is fine at an explicit boundary outside the behavior under test. Do not mock a collaborator whose behavior the test claims to verify. When valuable behavior is hard to reach from its interface, improve the interface; do not add test-only exports or switches.

## Rules

- **Expected values come from the requirement**: the issue, the format spec, or the correct behavior. Never copy them from a run of the code under test. Track SVG snapshots are the exception and need visual review.
- **See it fail.** Run a new test against broken code and read the failure. A test you never saw fail is not a guard.
- **Verify the whole outcome.** A track URL workflow ends when the data renders, not when a fetch happened.
- **Errors are behavior.** Assert expected failures; do not hide unexpected errors with broad console suppression.
- **Do not retest libraries** such as MUI, Zod, and React.

## Track render snapshots

Tracks guard their rendering with SVG file snapshots: mount the track with a deterministic fixture, region, and width, export it with `exportBrowserImage(svg, "svg")`, and compare the text with `toMatchFileSnapshot` against a `.svg` file. Keep one per track and user-selectable display mode. When one changes, open both images; update only for an intended visual change or a markup-only change whose images match, and say which in the PR. Remove recurring noise, such as generated IDs, in the shared export helper rather than loosening a test. A snapshot shows how a track looks, not whether its values are right, so assert values users read, such as tooltip text, explicitly. Do not snapshot React trees, store state, or intermediate geometry.

## Browser tests

Use a real browser only when correctness depends on layout, hit testing, focus, scrolling, gestures, or APIs jsdom lacks. When an epic ships a user-facing workflow, its acceptance criterion becomes one browser journey.

## Private code

A test of private code needs a correctness or performance risk that public tests cannot practically reach, such as gene composite geometry or binary decoding. Name the risk in a one-line suite comment and assert the algorithm's result.

## Render budgets

Render budgets (`*.renders.test.tsx`) measure performance, not behavior, so the two-edit check and boundary rules do not apply. Follow the verify-renders skill.

## Existing tests

When a refactor breaks a test and supported behavior did not change, the test was pinned to internals: delete it or move it to the boundary. When you edit a test file, apply the two-edit check to the tests you touch. Before deleting a test that alone guards supported behavior, add coverage at the boundary. Leave unrelated test files for a separate PR.
