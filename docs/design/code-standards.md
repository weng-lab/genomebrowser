# Code standards

How we design features and modules, plus constraints lint cannot enforce. Take syntax and local patterns from the code; when nearby code disagrees with this page, follow this page in new code.

## Feature and module design

Before introducing a substantial new hook, module, or abstraction, sketch the caller's usage in TypeScript, list the obligations the types do not express, and compare against the simplest alternative that works.

### Build deep modules

Prefer a small, clear interface that hides substantial complexity—state transitions, coordination, clamping, interruption, and cleanup—over many shallow helpers or pass-through wrappers.

Keep related decisions together so a change to validation, clamping, or cleanup stays inside one module instead of scattering across callers. A module's real interface includes every obligation its types do not express: call order, lifetime, error handling, and teardown. Minimize those hidden obligations.

### Own the complete operation

Give one owner the full lifecycle of an operation: start, transient state, commit, interruption, and cleanup. Callers request an outcome; they do not assemble steps or mirror active state.

For example, UI controls and agent commands call the same owner for session open/save, browser pan, and track sorting. If a caller has to remember to reset flags, cancel in-flight work, or keep two stores in sync, move that responsibility into the owner.

### Extend existing owners

Add new behavior to the owner that already manages that lifetime—a store, track module, feature operation, or host component (`GenomeBrowser`, `BrowserProvider`, `BrowserCanvas`). Pass the thing itself: props, refs, and plain functions.

Do not layer around the system with module-level registries, globals, side channels, or wrapper types that only add a field. For example, image export takes an optional `svgRef` on `GenomeBrowser` and `exportBrowserImage(svg, …)`, not a registry keyed by browser store (rejected in #379).

### Earn every seam and leave no shims

Add a seam or shared abstraction only for real variation (like the track-module contract) or a testing boundary that cannot be hit through public APIs—and generalize after a second concrete use, not before.

Apply the deletion test: if removing a layer only removes handoffs, delete it. Do not add compatibility aliases, shims, or deprecated re-exports unless asked. Existing file and package boundaries are history, not a reason to preserve a bad split.

## Implementation constraints

### React and browser instances

- A prop read only on mount must be named `initial*` or `default*`. Every other prop stays reactive: do not copy it into state and ignore later updates.
- Browser instances are independent unless the host passes the same stores. Scope providers, refs, and mutable resources to one instance.
- When render count or re-render behavior is an important part of a change, measure it ad hoc with the `verify-renders` skill instead of reasoning about it.

### Embedded UI

Packages render inside scientific host sites. Use MUI and inherit colors, spacing, and typography from the host theme; track colors come from track config, independent of chrome.

Settings apply live; add Apply/Cancel only when a workflow genuinely needs a draft, and preserve entered values on validation failure. Track modules own their settings forms; core owns the dialog shell.

Keep labels visible, name icon actions, never use color as the sole state signal, and wrap or stack on narrow viewports rather than shrinking controls.

### Agent invariants (web app)

- Every agent operation is also available in the UI, and both mutate the same session state—never a separate agent copy of the browser.
- Disabling agents in account settings blocks all agent access, not just the UI panel. Manual browsing keeps working when agents are off, unavailable, or rate-limited.
- Images an agent exports go to the user, never into model context.
- A session ID alone grants nothing: authorize every agent request against the signed-in owner.

Tests follow the [testing policy](../contributing/testing.md).
