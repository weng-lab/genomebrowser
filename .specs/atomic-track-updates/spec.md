# Complete track state and atomic updates for module settings

**Status:** Ready

## Problem

Module settings components do not receive their track as props. They read browser stores directly and therefore depend on an assumed browser context. This hides their inputs, weakens module typing, and makes settings harder to reuse and test.

The track store already provides `updateTrack` for atomic base and config changes, but interaction changes still use a separate `updateInteraction` method. A settings component cannot submit one validated change that spans every mutable part of a track.

## Desired Outcome

Module settings receive a read-only view of the complete active track and one `updateTrack` callback bound to that track's ID. The callback can update base, config, and interaction fields together. The store validates the complete candidate once and either commits the whole change or leaves the track untouched.

Settings remain live. Accepted edits update the store immediately. This work does not add Apply or Cancel behavior.

## Current State

- `TrackInstance` contains `type`, `base`, `config`, and optional `interaction`.
- Track identity consists of immutable `type` and `base.id`.
- `updateTrack` already accepts shallow `base` and `config` patches, validates the complete candidate, and commits once on success.
- `updateInteraction` remains a separate store method.
- Expected mutation failures return `TrackMutationResult`.
- `ReadonlyTrackInstance` already describes a shallow, read-only track view.
- `TrackSettingsComponent` has no props or module-specific generic types.
- The settings controller mounts module settings without props.
- Existing core and UI module settings read the browser stores directly.
- Base settings are rendered separately and are owned by the settings controller.

## Requirements

- **R1:** `TrackUpdate` must accept optional shallow patches for `base`, `config`, and `interaction`.
- **R2:** The public track store must use `updateTrack` as the only method for changing an existing track instance. Remove `updateInteraction` without an alias or compatibility wrapper.
- **R3:** `updateTrack` must build the complete candidate track, validate it once through the registered module, and commit it with one store update only when validation succeeds.
- **R4:** A failed update must return `{ ok: false, error }` and leave the complete track instance unchanged.
- **R5:** `type` and `base.id` must remain immutable, including when untyped JavaScript supplies those fields.
- **R6:** Module settings must receive a shallow, read-only view of the complete active track and an `updateTrack` callback bound to that track's ID.
- **R7:** The settings component type must carry the module's parsed config type and interaction item type.
- **R8:** The bound settings callback must pass mutations through the browser's existing interaction gate and return its `TrackMutationResult`.
- **R9:** Existing core and UI module settings must use the new props for track data and track mutations instead of reading the track or track store directly.
- **R10:** Settings edits must remain live. Each accepted edit must update the store immediately and expose its `TrackMutationResult` to the settings component.
- **R11:** Public documentation must explain the unified mutation API and the module settings contract.

## Technical Decisions

### Unified track mutation

Updates are shallow within each mutable part of the track:

```ts
export type TrackBaseUpdate = Partial<Omit<TrackBase, "id">>;

export type TrackUpdate<Config, InteractionItem = unknown> = {
  base?: TrackBaseUpdate;
  config?: Partial<Config>;
  interaction?: Partial<TrackInteraction<InteractionItem, Config>>;
};

export type TrackStore = {
  // Collection and ordering operations are unchanged.
  updateTrack: <Config, InteractionItem = unknown>(
    id: string,
    update: TrackUpdate<Config, InteractionItem>,
  ) => TrackMutationResult;
};
```

`updateTrack` merges the supplied parts into the current track. It restores the current `type` and `base.id` before validation, so unexpected identity fields from untyped callers cannot change identity. It merges interaction fields when either the current track or the update contains interaction state.

The store then validates the complete candidate through the module registered for the current track type. It replaces the track once if validation succeeds. Validation failure returns an error and does not call the store setter.

The update is not recursive. A module that changes a nested config or interaction value must supply the complete replacement for that nested value.

### Settings component contract

Module settings receive their track data and mutation function as props:

```ts
export type TrackSettingsProps<Config, InteractionItem = unknown> = {
  track: ReadonlyTrackInstance<Config, InteractionItem>;
  updateTrack: (
    update: TrackUpdate<Config, InteractionItem>,
  ) => TrackMutationResult;
};

export type TrackSettingsComponent<Config, InteractionItem = unknown> =
  ComponentType<TrackSettingsProps<Config, InteractionItem>>;
```

`TrackModule` and `defineTrackModule` carry these generic types into `settingsComponent`. This lets TypeScript check a module's settings against the output of its config schema and its interaction item type.

The settings controller selects the current track and binds its ID:

```tsx
<ModuleSettingsComponent
  track={track}
  updateTrack={(update) =>
    runTrackMutation(() => trackStore.updateTrack(track.base.id, update))
  }
/>
```

The read-only contract is enforced by TypeScript. The controller does not clone or freeze the track. Nested values are not made deeply read-only.

Module settings use these props as their source of track data and mutations. They do not call `useTrackStore`, `useTrackStoreApi`, or infer the active track from the settings store. Other browser hooks remain available when a setting has a separate reason to use them.

Controller-owned base settings remain separate from module settings and are not part of this prop contract.

### Application use

Application code uses the same store method directly:

```ts
const result = useTrackStore.getState().updateTrack<MyConfig, MyItem>("genes", {
  base: { height: 80 },
  config: { colorBy: "strand" },
  interaction: { onClick: handleGeneClick },
});
```

The supplied generic types help TypeScript check the patch. The registered module remains the runtime authority because a caller can supply an incorrect generic for a runtime track ID.

## Verification Strategy

- Store tests prove `updateTrack` can change base, config, and interaction together, validates once, and notifies subscribers once.
- Store tests prove validation failure leaves the original track object unchanged.
- Store tests prove attempts to change `type` or `base.id` do not change track identity.
- Type-contract tests cover `TrackUpdate`, read-only settings props, schema-derived config types, and interaction item types.
- Module-definition tests prove incompatible settings props fail type checking.
- Settings-controller tests prove module settings receive the current complete track and an updater bound to the correct ID.
- Settings-controller tests prove the bound updater honors the interaction gate and returns the mutation result.
- Core and UI settings tests prove components render from props and submit the expected updates without direct track-store access.
- Documentation examples must type-check against public package exports.

## Out of Scope

- Row-layout calculations, row-count state, automatic track height, or row-height controls.
- Creating the first-party tracks package or moving tracks into it.
- Changes to controller-owned base settings.
- Backward-compatible aliases for `updateInteraction`.
- Staged settings, Apply or Cancel behavior, undo, or transactions across multiple tracks.
- Recursive merging.
- Deeply freezing or cloning settings props.
- Creating or switching Git branches.

## Risks and Edge Cases

- Removing `updateInteraction` and changing settings props are breaking changes. Core, UI, tests, examples, and documentation must move together.
- A generic store method cannot prove that an explicitly supplied config type matches the module registered for a runtime ID. Module validation remains the runtime check.
- A settings modal can remain open while its track changes or is removed. The controller must keep using the current track selected by ID and stop rendering settings when that track no longer exists.
- Shallow patches replace nested values. Callers that send only part of a nested value may lose fields or fail module validation.
