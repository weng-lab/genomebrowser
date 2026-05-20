# V2 Core-Style Panning Reimplementation Plan

## Goal

Reimplement panning in `packages/v2` so it feels like old core while keeping v2's public APIs simple:

- Pan starts only from the track viewport, never the ruler or left gutter.
- The ruler remains zoom-selection only.
- Dragging reveals pre-rendered left/right buffers.
- `browserStore.region` changes only when the drag is released.
- No fetch happens during drag.
- After release, keep the old translated content visible while replacement data loads.
- Once replacement data is ready, swap it in and reset the visual drag offset to `0`.
- Keep overscan, drag offset, side width, and interaction-lock state private to the browser.
- Track modules still only receive `track`, `region`, `width`, `height`, and `data`.

## Current Code Notes

- `browserStore` currently exposes `pan(deltaBases)`, but the browser UI does not appear to use it.
- `GenomeBrowser.tsx` currently passes `region` and `trackWidth` directly into `useTrackData` and `TrackStack`.
- `useTrackData` currently dispatches `loading` for every fetch, which would blank previously successful tracks during pan refresh.
- `TrackFrame` positions each track's content at `translate(marginWidth, titleMargin)`, so the cleanest panning implementation is likely to add a browser-owned translated/clipped content group inside each frame or to split frame chrome from track content.

## Public API Changes

### `packages/v2/src/stores/browserStore.ts`

Remove panning from the public browser store API:

```ts
- pan: (deltaBases: number) => void;
```

Keep the store focused on externally meaningful state:

- `region`
- `setRegion`
- `trackWidth`
- `setTrackWidth`
- `marginWidth`
- font/title sizing
- `zoom`, if it remains part of public behavior

Do not add public store fields for:

- overscan multiplier
- drag delta
- side width
- render width
- interaction lock state

## Internal Constants

Add browser-private constants near the panning helper:

```ts
export const PAN_COMMIT_THRESHOLD_PX = 10;
export const PAN_OVERSCAN_MULTIPLIER = 3;
```

Do not source these from `browserStore`.

## Internal Geometry

The browser should maintain separate visible and render geometry:

- `visibleRegion = browserStore.region`
- `visibleWidth = browserStore.trackWidth`
- `renderWidth = visibleWidth * PAN_OVERSCAN_MULTIPLIER`
- for multiplier `3`, `sideWidth = visibleWidth`
- `renderRegion = expandRegion(visibleRegion, PAN_OVERSCAN_MULTIPLIER)`

For visible span `S` and multiplier `3`:

```ts
sideBases = Math.floor(S * (PAN_OVERSCAN_MULTIPLIER - 1) / 2); // S
renderRegion = {
  chromosome: visibleRegion.chromosome,
  start: visibleRegion.start - sideBases,
  end: visibleRegion.end + sideBases,
};
```

Negative starts are allowed for now to match old core behavior.

## Pan Math

On release, commit only if:

```ts
Math.abs(deltaPx) >= PAN_COMMIT_THRESHOLD_PX
```

Use old core-style math:

```ts
const visibleSpan = visibleRegion.end - visibleRegion.start;
const shiftBases = Math.floor((deltaPx / visibleWidth) * visibleSpan);
const nextRegion = {
  chromosome: visibleRegion.chromosome,
  start: visibleRegion.start - shiftBases,
  end: visibleRegion.end - shiftBases,
};
```

Do not clamp the committed region yet.

## Browser-Private Pan State

Start with a small browser hook/helper rather than a broad context unless the implementation needs context later.

Suggested private state:

- `deltaPx`
- `isDragging`
- `isInteractionLocked`
- `dragStartClientX`
- `dragStartDeltaPx`

Suggested actions:

- `beginPan(clientX)`
- `updatePan(clientX)`
- `endPan()`
- `resetPan()`
- `lockInteractions()`
- `unlockInteractions()`

This state should live under `packages/v2/src/browser/`, for example:

- `browser/panConstants.ts`
- `browser/panMath.ts`
- `browser/usePanInteraction.ts`

## Data Loading Behavior

`useTrackData` needs to support stale successful data during refresh.

Recommended minimal API:

```ts
useTrackData(tracks, region, width, registry, {
  keepPreviousSuccess?: boolean;
  onSettled?: () => void;
});
```

Behavior:

- Initial load with no previous success shows loading.
- Refresh with `keepPreviousSuccess: true` keeps successful data visible instead of replacing it with loading.
- New successful data replaces old data when it arrives.
- Errors surface through the normal per-track error state.
- The browser unlocks and resets pan after all requests for the committed pan have settled.

If all-at-once swapping is simple, prefer it. Otherwise, per-track replacement is acceptable for the first pass as long as the browser does not blank successful tracks mid-pan-refresh and does not stay locked forever.

## Rendering Strategy

The browser owns clipping and centering; modules remain unaware of overscan.

Expected visual mapping:

- Browser visible viewport: `[marginWidth, marginWidth + trackWidth]`
- Expanded content width: `trackWidth * 3`
- Base centering transform: `translate(marginWidth - sideWidth, y)`
- Live drag transform: `translate(deltaPx, 0)`

Conceptually:

```tsx
<clipPath id="trackViewportClip">
  <rect x={marginWidth} y={RULER_HEIGHT} width={trackWidth} height={tracksHeight} />
</clipPath>

<g clipPath="url(#trackViewportClip)">
  <g transform={`translate(${deltaPx}, 0)`}>
    <TrackStack
      region={renderRegion}
      trackWidth={renderWidth}
      contentX={marginWidth - sideWidth}
      ...
    />
  </g>
</g>
```

The exact prop names can differ, but `TrackStack`/`TrackFrame` should not learn about "overscan"; they should only receive the region, width, and positioning values they need to render.

Important implementation detail: because `TrackFrame` currently renders content, title, gutter, hover, and reorder controls together, avoid translating the left gutter/title/reorder controls. Either:

- split `TrackFrame` so chrome stays fixed and track content can be translated/clipped, or
- add a narrowly named content transform prop used only around `{children}`.

Prefer the smaller change if it stays readable.

## Interaction Handling

Use pointer events or mouse events in browser-owned viewport code. Avoid adding `react-draggable`.

Pan start rules:

- allowed: track viewport content area
- blocked: ruler
- blocked: left gutter/title area
- blocked: reorder controls
- blocked: while interaction lock is active

Implementation:

- attach `pointerdown` or `mousedown` to a transparent viewport rect over the track content area
- attach document-level move/up listeners during active drag
- call `preventDefault()` while dragging to avoid text selection
- use one browser-wide lock during post-release fetch

`SelectRegion` should accept an optional `disabled` prop if needed so ruler selection can be blocked while the pan refresh is locked.

## Release Flow

1. User drags in the track viewport.
2. Browser updates `deltaPx`; all track content translates together.
3. `browserStore.region` remains unchanged.
4. On release below threshold:
   - reset `deltaPx` to `0`
   - do not call `setRegion`
5. On release at/above threshold:
   - compute next visible region using current visible region and `deltaPx`
   - lock interactions
   - call `browserStore.setRegion(nextRegion)`
   - start fetch for the new expanded render region/width
   - keep previous successful data visible while loading
6. After all pan-refresh requests settle:
   - reset `deltaPx` to `0`
   - unlock interactions

## File-Level Plan

### `stores/browserStore.ts`

- Remove `pan` from `BrowserStore`.
- Remove the `pan` implementation.
- Leave `setRegion` behavior unchanged.

### `browser/panConstants.ts`

- Add `PAN_COMMIT_THRESHOLD_PX`.
- Add `PAN_OVERSCAN_MULTIPLIER`.

### `browser/panMath.ts`

- Add `expandRegion(region, multiplier)`.
- Add `getPanCommitRegion(region, width, deltaPx)`.
- Unit test these if the repo already has a test setup; otherwise keep them pure and easy to inspect.

### `modules/dataController.ts`

- Add stale-success refresh support.
- Avoid dispatching `loading` over an existing success when `keepPreviousSuccess` is enabled.
- Expose a way for `GenomeBrowser` to know when the current request batch has settled.

### `browser/GenomeBrowser.tsx`

- Derive visible/render geometry.
- Track browser-private pan state.
- Pass expanded `renderRegion` and `renderWidth` to `useTrackData`.
- Pass expanded render values into `TrackStack`.
- Own the viewport clip, drag hit area, and interaction lock.

### `browser/TrackStack.tsx` / `browser/TrackFrame.tsx`

- Render module content with expanded `region` and `width`.
- Keep track chrome fixed.
- Apply browser-provided content positioning/translation without exposing overscan concepts to modules.

### `browser/SelectRegion.tsx`

- Keep ruler-only zoom behavior.
- Add `disabled` only if the global interaction lock needs to block selection.
- Do not add panning logic.

## Error Handling

Pan refresh failure:

- Do not leave stale translated content stuck.
- After the request batch settles, reset `deltaPx` to `0` and unlock.
- Show normal per-track error UI for failed tracks.

Partial failures:

- Do not let one failed track keep the browser locked.
- Use existing v2 conventions: failed track becomes error state, successful tracks render their data.

Very large drags:

- Commit with the same old core math.
- No momentum, inertia, or repeated fetch during drag.

## Test Scenarios

- `browserStore` no longer exposes `pan`.
- `setRegion` behavior is unchanged.
- Expanded region for multiplier `3` adds one visible span to each side.
- `sideWidth` equals visible `trackWidth`.
- `deltaPx -> shiftBases` matches old floor behavior.
- Drag under `10px` snaps back with no region change.
- Drag on track viewport moves all track content together.
- Drag on ruler does not pan.
- Drag on left gutter/title/reorder controls does not pan.
- Region changes only on release.
- No fetch happens during drag.
- Pan refresh keeps old successful content visible while loading.
- On refresh settle, content resets to `deltaPx = 0`.
- Interaction lock blocks second drag during refresh.
- Modules still work with ordinary `region + width` outside the browser.
- Negative committed starts are still possible.

## Acceptance Criteria

1. Dragging only the track viewport pans visually in real time.
2. `browserStore.region` changes only on drag release.
3. Fetchers receive expanded region and `3x` width.
4. Renderers receive expanded region and `3x` width, but no overscan-specific props.
5. Browser-owned clipping shows only the visible center window.
6. During post-release fetch, previous successful content remains visible.
7. After replacement requests settle, the browser resets `deltaPx` to `0`.
8. Interactions are locked during post-release fetch.
9. Threshold and overscan multiplier are obvious browser-private constants.
10. Public browser-store API contains no pan internals.
