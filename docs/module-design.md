# Module design

Use when introducing or substantially changing a hook, module, or other boundary within a package. [Architecture](architecture.md) and [feature placement](feature-placement.md) choose the package; this page asks what one owner should do and what callers must know.

## Own the complete operation

Give each module a coherent responsibility. For an interaction, ownership includes initiation, temporary state, completion, and interruption. Callers should not assemble the operation or duplicate active-gesture state.

An interface is everything a caller must know: inputs, results, effects, ordering, lifetime, errors, cleanup. State obligations the types omit explicitly when choosing a boundary.

Prefer depth: an understandable interface that hides meaningful complexity. Keep related knowledge and changes with the owner so a clamping or cleanup change does not scatter across callers.

Illustrative sketch (not a public API): prefer `useBrowserPan({ svg, browserStore, trackWidth, content })` over making every caller wire preview, commit, and cancel callbacks that reimplement the same session rules.

## Seams that earn their cost

Justify a seam with real variation or a testing need. The track-module boundary works because tracks differ while core shares one contract. Apply a deletion test: if removing the layer only removes handoffs, it may not be earning its keep. Side effects can live inside the owner when that keeps lifetime and failure handling coherent.

## Verify through the interface

Exercise behavior through the interface callers use, including interruption and failure when they affect the contract. See [testing](contributing/testing.md).
