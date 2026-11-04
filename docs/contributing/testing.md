# Testing

A test guards against behavior coming back broken when someone changes the code later. It does not prove that a change works. Running the change on the real surface does that. Keep a test only when it catches real breaks cheaply. Every other test costs upkeep and catches nothing.

## Decide on every change

Decide whether each change gets a test. Give the reason in one line in the PR, such as "No test: copy change only" or "Test: BigWig render snapshot, catches lost negative values".

Write a test when all of these hold:

- It fails on the broken code for the right reason.
- It asserts what a user or caller sees, such as rendered SVG, a store state, a payload, a return value, or an error type callers branch on.
- It fits an existing harness in the package.
- It would catch the break if someone changes the code again.

Skip the test when it would only restate the change, such as a constant, copy, or a style. Also skip it when it duplicates existing coverage or needs new mocking setup. Use the closest check you can run, and say so.

Prefer one or two tests that pin the behavior over a suite of small cases.

## The two-edit check

Judge every test you write, keep, or review by imagining two edits:

1. **Break the behavior.** Return a wrong value, skip an effect, or do it twice. If the test still passes, it proves nothing.
2. **Change only the internals.** Keep every observable result and restructure underneath. If the test now fails, it is pinned to the implementation.

Keep a test that fails the first edit and survives the second. Rewrite or delete the rest.

## Where tests call in

Call in through the interface consumers use, and keep everything between input and outcome real.

| Package       | Call in through                                                             | Assert                                       |
| ------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| `reader`      | Public reader API on fixture files over HTTP range requests                 | Decoded records                              |
| `core`        | Mounted `GenomeBrowser`, documented store operations, track module contract | Rendered output, store state, callbacks      |
| `tracks`      | The track module mounted in `GenomeBrowser` with a fixture                  | SVG snapshot, tooltip text, setting effect   |
| `ui`          | The user workflow on the component                                          | Screen content or browser store state        |
| `apps/server` | A real HTTP server and MCP client                                           | Tool results and delivered command payloads  |
| `apps/web`    | Routes, session lifecycle, and the workspace with real Postgres and Redis   | Responses, persisted sessions, rendered data |

Fake only what is outside the repository. Serve remote data from fixture files, replace auth providers with a test server, and control time with fake timers. Do not `vi.mock` a module from this repository, and do not mock a collaborator that implements the behavior under test.

When valuable behavior is hard to reach from its interface, improve the interface. Do not add test-only exports or switches.

## Rules

- **Expected values come from the requirement.** Write them as literals from the issue, the format spec, or the correct behavior. Never copy them from a run of the code under test.
- **See it fail.** Run a new test against broken code and read the failure message. A test you never saw fail is not a guard.
- **The contract decides what counts as behavior.** A payload sent to another service is behavior. A call to an internal helper is not. An error type callers branch on is behavior. The wording of a message no caller reads is not. When "no call" is the promise, pair it with a case where the call happens.
- **Verify the whole outcome.** A track URL workflow ends when the data renders. A fetch count can pass while the renderer crashes.
- **Errors are behavior too.** Assert expected failures. Do not hide unexpected errors with broad console suppression.
- **Do not retest libraries.** MUI, Zod, and React have their own tests.

## Track render snapshots

First-party tracks guard their rendering with SVG file snapshots. A snapshot catches visual regressions in changes that are not meant to alter rendering, such as refactors, data-path changes, and dependency upgrades. No track has snapshots yet. The first snapshot suite adds the shared export helper in `packages/tracks/test/`.

- Mount the track in `GenomeBrowser` with a deterministic fixture, a fixed region, and a fixed width. Export it with `exportBrowserImage(svg, "svg")`, which produces the same SVG users download. Compare the result with `toMatchFileSnapshot` against a `.svg` file, so reviewers can open it as an image.
- Keep one snapshot per track and display mode a user can choose. Add one when a new mode or visual feature ships.
- A changed snapshot means changed rendering. Open the old and new images. Run `vitest -u` only if the change is meant to alter what users see, and say so in the PR.
- A refactor can change the markup without changing the picture. Confirm the images match, then accept the new snapshot. If a track's snapshot changes on most refactors, remove the noise, such as generated IDs or float precision, in the shared export helper. Do not loosen individual tests.
- A snapshot guards how a track looks, not whether its values are right. A reviewer approves a snapshot with a wrong value as easily as one with the right value. Assert values a user reads, such as tooltip text and labels, explicitly.
- Do not snapshot React trees, store state, or intermediate geometry.

## Browser tests

Use a real browser only when correctness depends on layout, hit testing, focus, scrolling, gestures, or browser APIs that jsdom lacks. Test data handling and asynchronous ordering in integration tests.

Browser journeys come from epics. When an epic ships a user-facing workflow, its acceptance criterion becomes one browser journey. Do not add browser tests for single features that an integration test covers. Run the existing dynseq suite with `pnpm tracks test:e2e`. `pnpm verify` does not run it.

## Private-code exceptions

A test of private code needs a correctness or performance risk that public-boundary tests cannot practically reach. Gene composite geometry and binary decoding can qualify. Convenience, faster setup, or merely containing logic does not. Name the risk in a one-line suite comment, and assert the algorithm's result, not intermediate representations or generated IDs.

## Render budgets

Render budgets are an intentional, implementation-sensitive exception. `*.renders.test.tsx` scenarios count committed renders with `@weng-lab/render-probe`. Follow the [verify-renders skill](../../.agents/skills/verify-renders/SKILL.md).

## Existing tests

When a refactor breaks a test, first check whether supported behavior changed. If it did not, the test was pinned to internals, so delete it or move it to the boundary. Do not just update its expectations.

When you edit a test file, apply the two-edit check to the tests you touch. Delete implementation-only and duplicate tests without replacing them. Before deleting a test that uniquely guards supported behavior, add coverage at the boundary. Leave unrelated test files for a separate cleanup PR.

See [Verifying changes](verify.md) for commands and handoff checks.
