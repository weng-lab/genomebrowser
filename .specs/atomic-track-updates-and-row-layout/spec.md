# Atomic track updates and row-layout settings

**Status:** Ready

## Problem

Track instances divide mutable state across browser-owned `base`, module-owned `config`, and optional `interaction`. The public track store exposes separate `updateBase`, `updateConfig`, and `updateInteraction` methods, while a module settings component receives only `{ id, config, updateConfig }`. A settings component therefore cannot atomically coordinate a base field with a config field.

This prevents row-rendering tracks from offering coherent height controls. The renderer knows the current row count, `base.height` stores the track height, and a module-specific `config.rowHeight` would store row density. Changing one setting may require changing the other, but the current public interfaces provide neither a complete track snapshot nor one validated mutation boundary for both values.

## Desired Outcome

Applications and module settings use one public, atomic `updateTrack` operation to change any mutable part of a track instance. Row-track authors can combine `useAutoTrackHeight` in a renderer with a documented settings utility that keeps `base.height` and `config.rowHeight` coherent while preserving row height when data, region, or display changes alter the number of rows.

Settings remain live: accepted edits update the track store immediately. No Apply/Cancel transaction model is introduced.

## Current State

- `TrackInstance` contains `type`, `base`, `config`, and optional `interaction`.
- Track identity consists of immutable `type` and `base.id`.
- The track store validates runtime mutations against the registered module before committing them.
- Expected mutation failures return `TrackMutationResult` rather than throwing.
- `updateBase`, `updateConfig`, and `updateInteraction` each validate and commit independently.
- A module settings component receives `{ id, config, updateConfig }`; base settings are rendered separately.
- `useAutoTrackHeight(id, rowCount, options)` currently computes `max(minHeight, max(1, rowCount) * rowHeight)` and writes that value to `base.height` after rendering.
- BigBed squish and transcript renderers currently use automatic height with a fixed row height. Their configs do not expose `rowHeight`.

## Requirements

- **R1:** Replace the public `updateBase`, `updateConfig`, and `updateInteraction` track-store methods with one public `updateTrack` method. Do not retain aliases or compatibility wrappers.
- **R2:** `updateTrack` must accept optional shallow patches for `base`, `config`, and `interaction` in one operation.
- **R3:** `updateTrack` must merge the complete candidate track, validate it once through the registered module, and commit it with one store update only when validation succeeds.
- **R4:** A failed `updateTrack` must return `{ ok: false, error }` and leave the entire track instance unchanged.
- **R5:** `type` and `base.id` must remain immutable through `updateTrack`, including when untyped JavaScript supplies unexpected identity fields.
- **R6:** Module settings components must receive a read-only snapshot of the complete track instance and an `updateTrack` callback already bound to that track's ID.
- **R7:** Existing core and UI settings components must migrate to the new settings contract; no component may reach into a globally assumed track store.
- **R8:** Row-rendering modules may define `rowHeight` as a positive numeric config field. It is a visual option and must not trigger data fetching.
- **R9:** The renderer-side automatic-height utility must report the current row count for the track while preserving the configured row height when row count changes.
- **R10:** Export pure row-layout calculations and a settings hook as public core utilities so custom track authors can implement the same behavior without duplicating synchronization logic.
- **R11:** A settings-originated row-height change must preserve the requested row height, calculate the required track height, and atomically update `config.rowHeight` and `base.height`.
- **R12:** A settings-originated track-height change must derive the row height for the current row count and atomically update `base.height` and `config.rowHeight`.
- **R13:** A renderer-originated row-count change must preserve row height and update only track height.
- **R14:** Settings edits must remain live. Each accepted edit must update the store immediately and surface its `TrackMutationResult` to the settings component.
- **R15:** BigBed squish and transcript tracks must adopt configurable row height and the shared row-layout utilities. Display modes that do not arrange features into variable rows need not expose row-layout controls.
- **R16:** Public documentation must explain the unified mutation API, row-layout invariants, renderer/settings responsibilities, and a complete custom row-track example.

## Technical Decisions

### Unified track mutation

The public mutation shape is shallow at each track-instance boundary:

```ts
export type TrackBaseUpdate = Partial<Omit<TrackBase, "id">>;

export type TrackUpdate<Config, InteractionItem = unknown> = {
  base?: TrackBaseUpdate;
  config?: Partial<Config>;
  interaction?: Partial<TrackInteraction<InteractionItem, Config>>;
};

export type TrackStore = {
  // Existing collection and ordering operations remain.
  updateTrack: <Config, InteractionItem = unknown>(
    id: string,
    update: TrackUpdate<Config, InteractionItem>,
  ) => TrackMutationResult;
};
```

`updateTrack` performs the conceptual operation below. Object spreads illustrate shallow merge semantics; the implementation must also guard identity at runtime.

```ts
function updateTrack(id, update) {
  const current = getTrack(id);
  if (!current) return mutationError(`No track found for id: ${id}`);

  const candidate = {
    ...current,
    type: current.type,
    base: {
      ...current.base,
      ...update.base,
      id: current.base.id,
    },
    config: {
      ...current.config,
      ...update.config,
    },
    interaction:
      current.interaction || update.interaction
        ? { ...current.interaction, ...update.interaction }
        : undefined,
  };

  const validated = registry.get(current.type).validate(candidate);
  replaceTrackOnce(id, validated);
  return { ok: true };
}
```

The update is not a recursive merge. A module that owns nested config must provide the complete replacement for any nested value it changes. Existing construction behavior remains unchanged.

### Settings component contract

Settings receive one immutable view and one bound mutation operation:

```ts
export type ReadonlyTrackInstance<Config, InteractionItem = unknown> = Readonly<{
  type: string;
  base: Readonly<TrackBase>;
  config: Config extends object ? Readonly<Config> : Config;
  interaction?: Readonly<TrackInteraction<InteractionItem, Config>>;
}>;

export type TrackSettingsProps<Config, InteractionItem = unknown> = {
  track: ReadonlyTrackInstance<Config, InteractionItem>;
  updateTrack: (update: TrackUpdate<Config, InteractionItem>) => TrackMutationResult;
};
```

The settings controller binds the track ID and applies the existing mutation gate:

```tsx
<ModuleSettingsComponent
  track={track}
  updateTrack={(update) => runTrackMutation(() => trackStore.updateTrack(track.base.id, update))}
/>
```

Application code uses the same store API directly:

```ts
const result = useTrackStore.getState().updateTrack<RowConfig>("genes", {
  base: { height: 80 },
  config: { rowHeight: 16 },
});
```

### Row-layout model

Row height is module configuration because it controls how a module renders features. Track height remains browser-owned base state. Row count is transient renderer/layout state and is never persisted in config or serialized track instances.

The shared calculation includes optional gaps and vertical padding:

```ts
export type RowLayoutOptions = {
  minHeight?: number; // default 30
  minRowHeight?: number; // default 1
  rowGap?: number; // default 0
  paddingTop?: number; // default 0
  paddingBottom?: number; // default 0
};

export function heightForRows(
  rowCount: number,
  rowHeight: number,
  options?: RowLayoutOptions,
): number;

export function rowHeightForHeight(
  rowCount: number,
  height: number,
  options?: RowLayoutOptions,
): { height: number; rowHeight: number };
```

The calculations use:

```text
effectiveRows = max(1, rowCount)
gaps = max(0, effectiveRows - 1) * rowGap
contentHeight = paddingTop + paddingBottom + gaps + effectiveRows * rowHeight
resolvedHeight = max(minHeight, contentHeight)
```

`heightForRows` clamps row count to a non-negative integer, clamps row height to `minRowHeight`, and returns `resolvedHeight`.

`rowHeightForHeight` treats height as user intent. It derives the row height that fits the effective row count after subtracting gaps and padding, clamps that value to `minRowHeight`, and returns both the normalized row height and the resulting valid height. If the requested height cannot contain the minimum row height, the returned height is increased rather than allowing clipping. Calculations retain numeric precision; display rounding belongs to the consuming form control.

### Renderer-side row-count ownership

`useAutoTrackHeight` remains the renderer-facing API and accepts the configured row height:

```ts
export function useAutoTrackHeight(
  trackId: string,
  rowCount: number,
  options?: RowLayoutOptions & { rowHeight?: number },
): number;
```

The hook must:

1. Register the latest normalized row count in browser-scoped transient layout state keyed by track ID.
2. Remove its registration when the renderer unmounts.
3. Return the normalized row height for rendering.
4. Recalculate height with `heightForRows` when row count, configured row height, or layout options change.
5. Update only `base.height` for renderer-originated changes; it must never infer or write config row height.

The transient row-count registry belongs to the browser instance so multiple browsers and duplicate IDs in different stores cannot interfere.

### Settings-side row-layout utility

The public settings hook coordinates explicit user edits:

```ts
export type RowLayoutSettingsInput<Config> = {
  track: ReadonlyTrackInstance<Config>;
  rowHeight: number;
  updateTrack: (update: TrackUpdate<Config>) => TrackMutationResult;
  rowHeightUpdate: (rowHeight: number) => Partial<Config>;
  options?: RowLayoutOptions;
};

export type RowLayoutSettingsResult = {
  height: number;
  rowHeight: number;
  rowCount: number;
  setHeight: (height: number) => TrackMutationResult;
  setRowHeight: (rowHeight: number) => TrackMutationResult;
};

export function useRowLayoutSettings<Config>(
  input: RowLayoutSettingsInput<Config>,
): RowLayoutSettingsResult;
```

`rowHeightUpdate` keeps the hook independent of a particular config property name while allowing conventional `{ rowHeight }` configs:

```ts
rowHeightUpdate: (rowHeight) => ({ rowHeight });
```

The hook uses reducer actions that encode change provenance. It must not synchronize values through mutually dependent Effects.

```ts
type RowLayoutSettingsAction =
  | { type: "heightChanged"; height: number }
  | { type: "rowHeightChanged"; rowHeight: number }
  | { type: "rowCountChanged"; rowCount: number };
```

- `heightChanged` derives row height and submits one update containing both `base.height` and the `rowHeightUpdate` config patch.
- `rowHeightChanged` preserves row height, derives height, and submits both fields atomically.
- `rowCountChanged` preserves row height. Renderer-side automatic height owns the corresponding base-height update, so this action updates local settings state without writing config.
- If the renderer has not registered a row count, the hook temporarily uses one effective row. Once the renderer reports the real count, automatic height preserves the chosen row height and corrects height.
- If an update fails validation, the hook returns the failure and restores values from the current validated track snapshot.

### Live settings pseudocode

```tsx
type RowTrackConfig = {
  url: string;
  rowHeight: number;
};

function RowTrackRenderer({ id, config, data, width, height, region }) {
  const rows = arrangeFeaturesIntoRows(data, region, width);
  const rowHeight = useAutoTrackHeight(id, rows.length, {
    rowHeight: config.rowHeight,
    minHeight: 30,
    rowGap: 2,
  });

  return (
    <g>
      <rect width={width} height={height} fill="white" />
      {rows.map((row, index) => (
        <FeatureRow key={index} features={row} y={index * (rowHeight + 2)} height={rowHeight} />
      ))}
    </g>
  );
}

function RowTrackSettings({ track, updateTrack }: TrackSettingsProps<RowTrackConfig>) {
  const layout = useRowLayoutSettings({
    track,
    rowHeight: track.config.rowHeight,
    updateTrack,
    rowHeightUpdate: (rowHeight) => ({ rowHeight }),
    options: { minHeight: 30, rowGap: 2 },
  });

  return (
    <SettingsSection title="Row layout">
      <NumberField
        label="Track height"
        value={layout.height}
        onChange={(height) => layout.setHeight(height)}
      />
      <NumberField
        label="Row height"
        value={layout.rowHeight}
        onChange={(rowHeight) => layout.setRowHeight(rowHeight)}
      />
    </SettingsSection>
  );
}

const rowTrackModule = defineTrackModule({
  type: "row-track",
  configSchema: z.object({
    url: fetchOnChange(z.string().min(1)),
    rowHeight: z.number().positive().default(12),
  }),
  fetch: fetchRowTrackData,
  render: { pack: RowTrackRenderer },
  settingsComponent: RowTrackSettings,
});
```

Expected behavior:

```text
Region changes from 3 rows to 5:
  rowHeight remains 12
  height becomes 5 * 12 plus configured gaps and padding

User changes rowHeight from 12 to 16 with 5 rows:
  rowHeight becomes 16
  height is updated atomically to fit 5 rows

User changes height to 50 with 5 rows and no gaps or padding:
  height becomes 50
  rowHeight becomes 10 in the same validated mutation
```

## Verification Strategy

- Store contract tests prove `updateTrack` can update base, config, and interaction together; validates once; commits once; and leaves state unchanged on failure.
- Store tests prove attempts to mutate `type` or `base.id` cannot change identity at runtime.
- Type-contract tests cover `TrackUpdate`, read-only settings snapshots, module config inference, and settings callback types.
- Settings-controller tests prove settings receive the current complete track and a mutation-gated updater bound to the correct ID.
- Pure utility tests cover zero, one, and many rows; fractional dimensions; gaps; padding; minimum height; minimum row height; and reductions below valid bounds.
- Browser-scoping tests prove row counts do not leak between browser instances or survive renderer unmount.
- Hook tests prove row-count changes preserve row height, row-height edits update both fields atomically, height edits update both fields atomically, and failed validation restores validated values.
- BigBed and transcript tests prove `rowHeight` defaults are applied, visual changes do not refetch data, region/display row-count changes preserve row height, and settings expose both controls.
- Documentation examples must type-check against public package exports and use `YOUR_URL_HERE` unless reusing an existing repository URL.

## Out of Scope

- Backward-compatible aliases for `updateBase`, `updateConfig`, or `updateInteraction`.
- Staged settings, Apply/Cancel semantics, undo, or cross-modal transactions.
- Persisting row count in track config or serialized track instances.
- Automatically changing row height because data, region, display mode, or viewport width changes.
- Recursive/deep config merging.
- Row virtualization, scrolling within a track, or maximum-height overflow policies.
- Applying row-layout controls to fixed-height or single-density renderers that do not arrange data into variable rows.
- Creating or switching Git branches as part of this specification.

## Risks and Edge Cases

- The mutation API and settings props are intentionally breaking changes and require coordinated migration of core, UI, examples, tests, and documentation.
- A generic store method cannot guarantee at compile time that an explicitly supplied `Config` generic matches the module registered for a runtime ID; module validation remains the runtime boundary.
- Two separately mounted row renderers for the same track ID could compete to report row count. A module must render only one active display renderer per track, matching the browser's existing renderer-selection contract.
- Settings may open before data has loaded and before a renderer reports row count. The one-row fallback keeps controls operable; the first real report may visibly resize the track while preserving the selected row height.
- Very small requested heights are normalized upward when minimum row height, gaps, or padding cannot fit. The settings UI must display the normalized accepted value rather than leaving an invalid draft as if it were committed.
- Repeated fractional calculations must not be rounded internally, or alternating edits may drift. Input presentation may round without changing the stored number until the user submits that displayed value.
