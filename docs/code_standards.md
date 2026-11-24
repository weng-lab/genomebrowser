# Code standards

Decisions and requirements the code and lint cannot show. Take patterns and implementation details from the code itself. When nearby code disagrees with this page, follow this page in new code.

## Extend the owner that exists

New behavior extends the owners that already exist: stores, track modules, feature operations, and public hooks. Do not add module-level registries, globals, side channels, or wrapper types that only add a field. For example, image export takes the browser's SVG through an optional `svgRef` on `GenomeBrowser` and `exportBrowserImage(svg, …)`, not through a registry keyed by browser store (rejected in #379).

## Own the complete operation

An owner gives callers one coherent operation: start, temporary state, commit, interruption, and cleanup. Callers do not assemble it or duplicate its state. The UI and the agent call the same owner, as session open and save, browser pan, and track sorting do.

A seam needs real variation or a testing need, as the track-module boundary has. If removing a layer only removes handoffs, remove it. Generalize a shared API after a second concrete use, not before. Existing package contents are history, not a boundary to preserve.

## No compatibility layers

Do not add aliases, shims, or deprecated re-exports for older versions unless asked.

## React

- A prop that is read once is named `initial*` or `default*`. Every other prop stays current: do not copy it into state and ignore later changes.
- Browser instances are independent unless the host passes them the same stores. Scope providers and mutable resources to one instance.
- Zustand store instances used as hooks are named `use*`.
- When a change in core, tracks, or UI could change renders, measure it with the verify-renders skill instead of reasoning about it.

## Embedded UI

The packages render inside host sites, mostly scientific ones. Use MUI, take colors, spacing, and type from the host's theme, and never set global styles or a theme in a package. Track colors come from track configuration, independent of the chrome.

Settings apply live; add Apply and Cancel only when the workflow needs a draft. Keep entered values when validation fails. Track modules own their settings forms; core owns the dialog around them.

Keep labels visible, name icon actions, and never use color as the only signal of state. On narrow screens, wrap or stack rather than shrinking controls.

Tests follow the [testing policy](contributing/testing.md).
