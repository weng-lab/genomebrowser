# QA Findings

QA found one high-severity architectural/correctness issue and a few modularity/cleanliness risks.

**Findings**

1. High: data invalidation is keyed only by track IDs, so config changes can leave stale data rendered.
   - `packages/v2/src/modules/dataController.ts:20-24`
   - `packages/v2/src/modules/dataController.ts:27-59`
   - `packages/v2/src/browser/useRenderWindow.ts:18-24`
   - Since module `fetch(ctx)` depends on `config`, changing fetch-relevant config without changing track IDs does not trigger a refetch.
   - QA called this the main correctness issue to fix first.

2. Medium: track row orchestration is getting wide across:
   - `packages/v2/src/browser/TrackStack.tsx`
   - `packages/v2/src/browser/TrackFrame.tsx`
   - `packages/v2/src/browser/SwapTrack.tsx`
   - Behavior is split across layout, hover, frame visuals, settings opening, reorder controls, drag-to-reorder, and content rendering.
   - QA sees this as the clearest browser-layer sprawl.

3. Medium/Low: `settingsStore.tsx` mixes state and UI concerns.
   - It currently contains:
     - store types/state
     - store creation
     - default modal UI
     - default base settings UI
     - presentational helper `SettingsSection`
   - Built-in module settings import `SettingsSection` from the store file, which muddies ownership.

4. Low: `lib.ts` and `sdk.ts` make the public surface look somewhat duplicated/incoherent.
   - `sdk.ts` looks like a second API surface but is not actually exported via `package.json`.
   - QA recommends tightening that before consumers build expectations around it.

**Overall QA assessment**

- No major architectural collapse.
- Track modules themselves are in good shape as deep modules.
- `defineTrackModule` is a strong abstraction.
- Browser orchestration is expected to be wider, but the main areas to watch are:
  - data invalidation correctness
  - track-row orchestration sprawl
  - store/UI boundary in settings
  - public surface clarity between `lib.ts` and `sdk.ts`

If you want, I can next help you turn these QA findings into:

1. fixes we should do now,
2. things to watch but leave alone,
3. things that need an ADR or architectural note.
