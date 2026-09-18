# Column customization

Customize the collection grid in [TrackSelect](TrackSelect.md) with application-owned MUI column options. Import all types and helpers on this page from `@weng-lab/genomebrowser-ui`.

## Usage

```ts
import { withValueMarkers, type TrackSelectColumnOverrides } from "@weng-lab/genomebrowser-ui";

export const columnOverrides: TrackSelectColumnOverrides = {
  signals: {
    assay: withValueMarkers({
      "ATAC-seq": "#02c7b9",
      "RNA-seq": { color: "#00aa00" },
    }),
    biosample: { width: 220 },
  },
};
```

Pass `columnOverrides` to TrackSelect. The collection must have the ID `signals` and expose the corresponding fields in its view.

## TrackSelectColumnOverride and TrackSelectColumnOverrides

`TrackSelectColumnOverrides` is a read-only map shaped as `collectionId -> field -> TrackSelectColumnOverride`. A `TrackSelectColumnOverride` accepts every partial MUI `GridColDef` option except `field`, which always comes from the collection view.

```ts
type TrackSelectColumnOverride = Omit<Partial<GridColDef>, "field">;
type TrackSelectColumnOverrides = Readonly<
  Record<string, Readonly<Record<string, TrackSelectColumnOverride>>>
>;
```

`GridColDef` is the MUI X Data Grid Premium column type. Overrides are shallowly merged into generated columns. Setting `width` removes generated `flex` unless the override also supplies `flex`. Setting `renderCell` replaces the default truncating, tooltip-enabled renderer. Unknown collection IDs and fields are ignored. Overrides do not add fields to the collection view.

## withValueMarkers

```ts
withValueMarkers(markers: ValueMarkerMap): TrackSelectColumnOverride
```

Returns an override containing `renderCell`. It adds a square color marker beside matching values and keeps the formatted text visible. The helper matches `String(params.formattedValue ?? params.value ?? "")` against marker keys. Unmatched values render text without a marker.

## ValueMarkerConfig and ValueMarkerMap

```ts
type ValueMarkerConfig = { color: string };
type ValueMarkerMap = Readonly<Record<string, string | ValueMarkerConfig>>;
```

Each key identifies a displayed value. A string value specifies its marker color directly; an object supplies the same color through its required `color` field. The helper passes colors to styling without validating them or choosing a fallback.

Markers are hidden from assistive technology; their text remains available. Custom `renderCell` implementations must preserve an accessible text equivalent and appropriate keyboard behavior.

[Back to track selection](README.md) · [TrackSelect props](TrackSelect.md#trackselectprops)
