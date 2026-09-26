# Testing

Tests should let us refactor with confidence. Exercise supported behavior through the interfaces consumers use and assert results they depend on. A refactor that preserves the public contract should normally leave tests unchanged.

## Boundaries and outcomes

Use public-boundary integration tests by default: reader file access, documented browser and track store operations, track module contracts, UI workflows, and executable commands. Choose the smallest supported boundary that exercises the behavior. Small input/output tests of public calculations are useful; an export from an internal source file is not itself a public contract.

Each case should detect a distinct, meaningful failure not already covered. Test reachable scenarios, including rejected inputs and failures. Avoid impossible internal states, duplicate assertions across layers, and tests added merely to cover changed functions or increase coverage percentages.

Keep the implementation between input and outcome real. Control external dependencies with contract-correct fixtures, deterministic network responses, or clocks. Do not mock collaborators that implement the behavior being tested. Assert public results, state, callbacks, or rendered content rather than private structures and helper calls.

Verify the complete outcome claimed by the test. A track URL workflow should establish that the resulting data renders; a fetch count can pass even if the renderer crashes. A store-only test may legitimately end at its documented state transition. Assert expected error behavior and do not hide unexpected errors with broad console suppression.

## Design for testability

Prefer deep modules: small, stable public interfaces that own substantial behavior. Callers and tests should request an operation and observe its result without coordinating internal helpers.

Elaborate setup, private state access, or extensive internal mocking can signal a design problem. Consider a small refactor to clarify ownership, make inputs explicit, or separate network and clock access from logic. Keep changes useful to production callers; avoid test-only exports, switches, and abstractions for every helper. If a test has no meaningful failure to detect, omit it. If valuable behavior is hard to exercise, improve its boundary.

Start new workflows with a tracer bullet: a thin working path through the public interface and real implementation. For example, load a small deterministic dataset and verify that the track displays it. Extend behavior and coverage together, adding edge cases at the smallest suitable public boundary.

## Test scope and ownership

Use React integration tests for hooks, state, and interactions. Use a real browser when correctness depends on layout, hit testing, focus, scrolling, gestures, or browser APIs. Keep browser workflows few and deterministic; test detailed data and asynchronous ordering cases in integration tests when browser execution adds no evidence. Do not reproduce MUI's own tests.

Core owns generic browser and module contract tests; tracks owns first-party track behavior. Give each behavior a primary testing home. Additional layers should protect distinct failures, such as correct reader output versus correct display of that output.

## Exceptions and maintenance

Private-code tests require substantial correctness or performance risk that public-boundary coverage cannot practically address. Explain that risk and limitation in a short suite comment. Complex biological geometry or binary decoding may qualify; convenience, faster setup alone, or simply containing logic do not. Assert algorithm results rather than intermediate representations.

When a refactor breaks a test, check whether supported behavior changed before updating expectations. Remove implementation-only tests and redundant coverage without replacement. Establish boundary coverage before removing a test that uniquely protects supported behavior.

Render budgets intentionally depend on implementation and complement functional coverage. They record committed renders with `@weng-lab/render-probe`; core's scenarios live in `packages/core/test/renders/`. Add or update scenarios when subscriptions, context, or props affect render behavior. Higher counts fail; accept lower counts with `vitest -u` and review the snapshot diff. Follow the [verify-renders skill](../../.agents/skills/verify-renders/SKILL.md) for measurement and investigation.

Before keeping a test, ask: what meaningful failure does it catch, does it exercise real behavior, and would it survive an internal refactor? Any tighter coupling needs the justification described above.

See [Verifying changes](verify.md) for commands and handoff checks.
