# Draft: restrict effects and use state machines selectively

Status: **Draft spike proposal, not accepted architecture**. Jair, Oct 29.
Evidence and reproducible commands: [effects spike](../../tools/effects/README.md).

## Context

The AST inventory finds 35 effect calls across apps/web and packages/core,
including five test calls. Of these, 28 synchronize external resources; only four
production sites are candidates for replacing state resets, derived state, or a
route-triggered load. Banning effects would force valid DOM measurement,
observers, ref publication, native gestures, connection lifetimes and cleanup
into less direct APIs without eliminating those responsibilities.

Saved sessions already have a feature-owned operation with Zustand stores and
Effect handling resource lifetime and concurrency. The spike integrates both a
typed reducer and XState into the autosave write lifecycle, through that existing
operation. Its behavior tests compare both variants under the same scenarios.

## Proposed decision

Restrict effects by purpose. Derive computed state during render; use identity
resets or controlled state for drafts; put interaction consequences in handlers;
let a route/query owner handle ordinary server data loading. Keep effects for
external synchronization with explicit lifetime and cleanup. Retain exhaustive
React dependency checking. Do not ban `useLayoutEffect` or legitimate setters
inside effects based on syntax alone.

Begin with the opt-in warning rule and reviewed external-sync fingerprints. It
flags seven sites, three in tests. Evaluate its review cost before enabling it
in default lint. Any stronger enforcement needs reviewed migration of mixed
sites, not a bulk autofix. A rule cannot reliably infer the purpose of arbitrary
callbacks or imported custom hooks.

Use discriminated unions when lifecycle phases carry different required data.
Prefer a typed reducer for small flat workflows, colocated with their feature
owner. Consider XState when nested/parallel lifetimes, actor supervision or state
visualization earn its runtime and concepts. Do not mandate state machines for
ordinary derived values, render demand, track fetching, or React's DOM lifetime.
Track modules continue to own track-specific fetching; core's data controller
continues to own browser demand and cancellation.

Keep the two variants on this spike for comparison. Do not infer that XState or
the new machine seam is approved for production. Here the reducer totals 257
source lines and XState 278 against 189 originally. The original autosave owner
remains a reasonable alternative: no measured correctness failure requires a
wholesale migration. If keeping a machine, select one and remove the comparison
selector and unused dependency before merging product code.

## Alternatives

A blanket effect ban is mechanically simple but targets 28 valid external-sync
sites and encourages hiding effects in wrappers. Keeping the current code with
existing hook lint is the cheapest option and retains the same observable
behavior. A warning restriction gives focused feedback while its false-positive
and review cost are assessed. Replacing the Effect runtime with XState would
reimplement scopes, request cancellation, locks and timers; this spike does not
provide evidence for that larger rewrite.

## Migration cost and consequences

The immediate restriction concerns four production sites, not 35 rewrites:

- Two download hooks mix identity resets with necessary cancellation/subscription
  cleanup. Medium scope: tag state by identity or remount the owning subtree;
  preserve in-flight cancellation and cover identity replacement.
- Automatic track height is derived but written into persisted track configuration.
  High scope: settle manual-height precedence and layout ownership first; current
  session behavior can save after data loads. Verify render budgets and persistence.
- Route-driven session opening needs direct URLs and browser history, not only
  event handlers. Medium/high scope: establish route-load ownership while retaining
  cancellation and save-before-switch behavior; ordinary query-cache adoption
  alone does not replace this workflow.

The three test-harness sites can move stimulus into test drivers when touched.
The 28 external sites need review and maintained reasons, not mechanical rewrites.
These are scope estimates, not measured engineering hours. The spike measures
code cost and automated behavior, not migration throughput, bundle impact,
production reliability, or performance gains. Warning adoption should precede any
error gate, and no workspace-wide migration deadline is proposed.

## Verification and open questions

The checked-in audit and lint CLI tests detect inventory drift and exercise
warnings. The real session lifecycle suite runs for both variants and adds a
terminal failure during conflict resolution. Workspace `pnpm verify` must pass
escalated, one run at a time, before this branch is handed off. Database tests
remain conditional on a configured PostgreSQL test server.

Juniper should review the mixed-effect classifications and assess whether the
union's state guarantees justify the additional code. Decide whether a reviewed
fingerprint allowlist is sustainable, whether route opening warrants a query
library, and whether the machine should also own refused-input history. Those
choices remain open; this draft does not silently adopt them.
