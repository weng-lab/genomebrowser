# Module design

Use this page when introducing or substantially changing a hook, module, or other boundary within a package. [Architecture](01-architecture.md) explains the major parts of the browser; [feature placement](02-feature-placement.md) helps choose the package or application that owns a capability. Module design asks what one owner should do and what its callers need to know.

## Own the complete operation

Give each module a coherent responsibility. For an interaction, ownership includes initiation, temporary state, completion, and interruption. Browser panning, for example, must connect input to a temporary content offset, a committed genomic region, and cleanup if the gesture ends early. Internal helpers can divide that work, but callers should not have to assemble the operation from separate pieces or maintain the same active-gesture state in multiple places.

An interface is everything a caller must know to use a module correctly. That includes inputs and return types, observable effects, event or call ordering, state and lifetime invariants, and error handling. A short signature can still be costly if the caller must learn hidden timing rules or coordinate cleanup. State those obligations explicitly when choosing a boundary.

Keep related knowledge and changes together. A module has depth when an understandable interface gives callers useful behavior while hiding meaningful complexity. A content transform, for instance, can own which SVG groups move and how offsets are clamped; panning can request an offset and use the applied result without knowing those details. This locality matters when a change to clamping should be made in one owner instead of across its callers.

The following TypeScript is an illustrative internal design sketch, not an existing public API. It shows the coordination a pan owner can absorb:

```ts
// Caller coordinates preview, commit, and interruption:
usePointerDrag(svg, {
  onMove: (delta) => content.setContentOffset(delta),
  onEnd: (delta) => browserStore.getState().setRegion(regionAfterPan(delta, trackWidth)),
  onCancel: () => content.setContentOffset(0),
});

// Caller delegates the whole interaction to its owner:
useBrowserPan({ svg, browserStore, trackWidth, content });
```

The second caller supplies its collaborators once. The pan owner can then keep the starting region, applied offset, input listeners, commit, and interruption rules together. This does not mean every interaction needs one hook; a separate content transform still earns its place by owning behavior panning can use without knowing its implementation.

Make that ownership visible in the implementation. Names should reveal effects, such as applying a temporary SVG offset. Comments should explain constraints that code alone does not show, such as clearing a pan session before releasing pointer capture because capture loss can re-enter termination. Keep state with the owner of its transitions, make cleanup guarantees explicit when an operation can fail, and use internal helpers when they clarify meaningful steps.

## Choose seams that earn their cost

Justify a seam with a concrete need and actual variation. A track module boundary works because tracks differ in fetching, rendering, and configuration while core can use the same contract. A small boundary around a network source or clock may also make behavior testable without changing production callers. Avoid a generic adapter whose only caller must supply callbacks for every internal step and still track the operation's state.

Apply the deletion test to each proposed layer. If removing a useful module forces callers to reproduce its behavior, the module is carrying a responsibility. If removing a layer makes the operation easier to follow and eliminates handoffs, that layer may add coordination without hiding useful work. Compare the proposal with a simpler design suited to the current responsibility before generalizing it.

These are tradeoffs, not quotas. The right number of adapters or methods depends on the behavior each one owns. Side effects can live inside the owner when that keeps their lifetime and failure handling coherent; isolating an external dependency can help when it varies or makes tests unreliable. Dependency injection is useful when callers can supply a meaningful collaborator, but passing every helper through an interface can expose implementation detail. A larger interface may be clearer than several small ones that require callers to follow an undocumented sequence.

## Verify the boundary

Exercise behavior through the interface its callers use and assert the results they can observe, including interruption and failure where those affect the contract. Internal helpers and focused internal tests remain useful when they make difficult logic easier to understand or protect substantial risk; they do not replace checks of the complete operation. See [testing](../02-contributing/testing.md) for the repository's test boundaries and exceptions.
