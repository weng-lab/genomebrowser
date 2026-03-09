# Track Registry Refactor Plan

## Core Idea

Replace the 3 hardcoded dispatch maps (`trackComponents`, `trackFetchers`, modal `switch`) with a single `TrackDefinition` per track type. Each track instance references its definition. No more `TrackType` enum — the definition reference IS the type.

Every track type = one deep module folder. Definition file is the public interface. Renderers, fetcher, settings panel are implementation details inside.

## New Types

```ts
// Shared behavior — 1 per track kind
interface TrackDefinition {
  type: string;
  displayModes: readonly string[];
  defaultDisplayMode: string;
  defaultHeight: number;
  renderers: Record<string, React.ComponentType<any>>;
  fetcher: (ctx: FetcherContext) => Promise<TrackDataState>;
  settingsPanel?: React.ComponentType<{ id: string }>;
}

// Base instance — per-track in the browser
interface Track {
  id: string;
  title: string;
  height: number;
  displayMode: string;
  definition: TrackDefinition;
  color?: string;
  titleSize?: number;
  shortLabel?: string;
  onClick?: (item: any) => void;
  onHover?: (item: any) => void;
  onLeave?: (item: any) => void;
  tooltip?: React.FC<any>;
}

// Per-type concrete types via intersection
type BigWigTrack = Track & {
  url: string;
  range?: YRange;
  customRange?: YRange;
  fillWithZero?: boolean;
};
```

## Typing Strategy

- `trackStore.getTrack(id)` returns `Track | undefined` — no per-type fields accessible without narrowing
- To access per-type fields, cast: `const t = getTrack(id) as BigWigTrack` → `t.url` is `string`
- Factory functions return concrete types: `createBigWigTrack({...})` returns `BigWigTrack`
- Inside each definition's fetcher/renderer, `ctx.track as BigWigTrack` is safe — only BigWig tracks use that fetcher
- Generic infrastructure (trackStore, displayTrack, useDataFetcher) only touches base `Track` fields
- `any` only appears at registry seams (renderer component type, interaction callbacks on base Track)

## Display Modes

Each definition declares its own display modes. No global `DisplayMode` enum.

```ts
const BigWigDefinition: TrackDefinition = {
  type: "bigwig",
  displayModes: ["full", "dense"] as const,
  defaultDisplayMode: "full",
  renderers: { full: ReworkBigWig, dense: DenseBigWig },
  ...
}
```

Context menu / display modal reads `Object.keys(track.definition.renderers)` to show available options.

## Phase 1 — Tracer Bullet: Types + Registry + BigWig

Cut over to the new system entirely. No dual-path shim. Old tracks break until migrated.

### Step 1: Rewrite `tracks/types.ts`

- Replace old types with `TrackDefinition` and `Track`
- Remove `TrackType` enum, `DisplayMode` enum, `Config<Item>`, `InteractionConfig`, `DisplayConfig`
- Keep `TrackDimensions`

### Step 2: Registry — new file `tracks/registry.ts`

- `trackRegistry: TrackDefinition[]`
- `registerTrack(def)`, `getDefinition(type)`

### Step 3: BigWig definition — new file `tracks/bigwig/definition.ts`

- Move `fetchBigWig` from `api/fetchers.ts` here
- Create `tracks/bigwig/settings.tsx` — move Range from `modal/bigWig/range.tsx`
- Export `BigWigDefinition`, `createBigWigTrack()`, `BigWigTrack` type
- Call `registerTrack(BigWigDefinition)` at module scope

### Step 4: Rewrite consumers for new system

- `displayTrack.tsx`: delete `trackComponents` map, use `track.definition.renderers[track.displayMode]`
- `useDataFetcher.ts`: delete `trackFetchers` import, use `track.definition.fetcher`
- `modal.tsx`: delete switch, use `track.definition.settingsPanel`
- `contextMenu.tsx` + `modal/shared/display.tsx`: use `track.definition.renderers`
- `store/trackStore.ts`: new `Track` type (no union)
- `api/fetchers.ts`: delete `trackFetchers` + per-type functions, keep shared utils

### Step 5: Update test

- Change BigWig tracks in `test/tracks.tsx` to use `createBigWigTrack()`
- Remove non-BigWig tracks from test temporarily
- Validate: dev server runs, BigWig renders, settings/context menu work

## Phase 2 — Expand to All Track Types

Same pattern per track, one at a time:

1. **BigBed** — `definition.ts`, `createBigBedTrack()`, no settings panel
2. **Transcript** — `definition.ts`, `settings.tsx` (version + geneName), `createTranscriptTrack()`
3. **Motif** — `definition.ts`, `createMotifTrack()`, no settings panel
4. **Importance** — `definition.ts`, `createImportanceTrack()`, no settings panel
5. **LDTrack** — `definition.ts`, `createLDTrack()`, special fetcher (preserves existing data)
6. **BulkBed** — `definition.ts`, `settings.tsx` (gap + datasetList), `createBulkBedTrack()`. Move datasets-to-props logic into renderer
7. **MethylC** — `definition.ts`, `createMethylCTrack()`, no settings panel
8. **Manhattan** — `definition.ts`, `createManhattanTrack()`, special fetcher (preserves existing data)

### Per-type concrete track types

| Track Type      | Extra Fields                                                                         |
| --------------- | ------------------------------------------------------------------------------------ |
| BigWigTrack     | `url`, `range?`, `customRange?`, `fillWithZero?`                                     |
| BigBedTrack     | `url`                                                                                |
| TranscriptTrack | `assembly`, `version`, `refetch?`, `geneName?`, `canonicalColor?`, `highlightColor?` |
| MotifTrack      | `consensusRegex`, `peaksAccession`, `assembly`, `peakColor?`                         |
| ImportanceTrack | `url`, `signalURL`                                                                   |
| LDTrackInstance | `show?`, `lead?`, `associatedSnps?`, `showScore?`                                    |
| BulkBedTrack    | `datasets`, `gap?`                                                                   |
| MethylCTrack    | `colors`, `urls`, `range?`                                                           |
| ManhattanTrack  | `cutoffValue?`, `cutoffLabel?`, `lead?`, `associatedSnps?`                           |

## Phase 3 — Clean Up

Delete old system entirely:

1. `tracks/types.ts` — remove `TrackType` enum, `DisplayMode` enum, `Config<Item>`, `InteractionConfig`, `DisplayConfig`
2. `api/fetchers.ts` — delete `trackFetchers` map + all per-type fetch functions. Keep shared utils: `FetcherContext`, `FetchFunction`, `getBigDataRace`, `fetchBigBedUrl`
3. `displayTrack.tsx` — delete `trackComponents` map, `getTrackComponent()`. Single path: `track.definition.renderers[track.displayMode]`
4. `modal/modal.tsx` — delete `ModalContent` switch. Replace with `track.definition.settingsPanel`
5. `contextMenu.tsx` — use `track.definition.renderers` only
6. `modal/shared/display.tsx` — same
7. `store/trackStore.ts` — `Track` is the new base interface (no union). Remove all per-type config imports
8. `custom/types.ts` — delete. All tracks work the same way now
9. Per-type `types.ts` — keep data types only, delete old config interfaces
10. `modal/bigWig/`, `modal/transcript/`, `modal/bulkbed/` — delete folders (settings moved into track folders)
11. `useDataFetcher.ts` — remove dual-path, single path: `track.definition.fetcher`
12. `lib.ts` — export `TrackDefinition`, `Track`, `registerTrack`, per-type factories + types. Remove `TrackType`, `DisplayMode`, old config type exports
13. Test files — update all to use factories
14. TfPeaks — convert from `CustomTrackConfig` to `TrackDefinition` + factory

## Resulting Folder Structure

```
tracks/
  types.ts              ← TrackDefinition, Track, TrackDimensions
  registry.ts           ← registerTrack(), getDefinition(), trackRegistry[]
  displayTrack.tsx      ← thin: reads track.definition.renderers
  bigwig/
    definition.ts       ← BigWigDefinition, createBigWigTrack(), BigWigTrack
    rework.tsx          ← full mode renderer
    dense.tsx           ← dense mode renderer
    settings.tsx        ← settings panel
    helpers.ts
    types.ts            ← ValuedPoint, BigWigData, YRange, etc.
  bigbed/
    definition.ts
    squish.tsx
    dense.tsx
    helpers.ts
    types.ts            ← Rect, SquishRect
  transcript/
    definition.ts
    squish.tsx
    pack.tsx
    settings.tsx
    helper.ts
    types.ts            ← Transcript, TranscriptList, Exon, etc.
  ...same for each track type
```

1 import + 1 factory call = track exists.
