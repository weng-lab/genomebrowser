# Code standards

Principles that **code structure and lint cannot fully enforce**. Prefer fixing ownership in the type/module graph, then a lint rule whose error states the fix, before adding a bullet here. Keep this file short.

See also [module design](module-design.md), [feature placement](feature-placement.md), and [testing](contributing/testing.md).

## Integrate into the existing system

New behavior should extend the owners that already exist (stores, track modules, feature operations, public hooks). Do **not** add an onion layer: module-level registries, wrapper types that only add a field, globals, or a high-level type re-wrapped for convenience.

Pass the thing itself: props, refs, and plain functions over DOM or data. Prefer an optional `svgRef` on `GenomeBrowser` and `exportBrowserImage(svg, …)` over a `WeakMap` registry keyed by browser store (`browserRegistry` / `MountedBrowser` pattern rejected on PR #379).

If a capability needs coordination, put it on the owner that already manages that lifetime (`GenomeBrowser`, `BrowserProvider`, `BrowserCanvas`, a feature module), not a new side channel.

## Own the complete operation

Callers should request one coherent outcome, not assemble initiation, temporary state, commit, interruption, and cleanup. Session open/switch/save and browser pan are examples: UI and agent paths call the same owner. See [module design](module-design.md).

## No compatibility layers by default

Do not add aliases, shims, or temporary exports for older package versions unless explicitly asked. If compatibility would help, explain why before proposing it.

## Do not invent track URLs

In examples, docs, and harnesses use `YOUR_URL_HERE` or a URL already in the repository. Never fabricate genomic data hosts.

## Zustand stores look like hooks

Bound store instances used as React hooks must have names starting with `use` (for example `useBrowserStore`) so the React compiler and tooling treat them as hooks. Prefer encoding this in lint when practical.

## Test through public boundaries

Exercise supported behavior through the interfaces consumers use. Assert outcomes they depend on. Render budgets are an intentional exception (implementation-sensitive). Private-code tests need a short suite comment naming the risk public tests cannot cover. Details: [testing](contributing/testing.md).

## Experience justifies abstraction

Start from a concrete need. Generalize a shared API only after integrating it and seeing a clear shared responsibility. Existing package contents are evidence of history, not a duty to preserve a bad boundary. See [architecture](architecture.md) and [ADR 0001](adr/0001-embeddable-package-boundaries.md).
