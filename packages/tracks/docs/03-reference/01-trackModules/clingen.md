# ClinGen annotation tracks

Four independent hg38 BigBed modules share interval rendering and feature details. A core track set can organize them without merging their data, errors, visibility, or settings.

## Usage

```tsx
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import {
  clinGenHaploModule,
  clinGenTriploModule,
  clinGenGeneDiseaseModule,
  clinGenCspecModule,
  createClinGenTrackSet,
} from "@weng-lab/genomebrowser-tracks/clingen";

const browserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr17", start: 43_000_000, end: 43_100_000 },
});
const trackStore = createTrackStore({
  modules: [clinGenHaploModule, clinGenTriploModule, clinGenGeneDiseaseModule, clinGenCspecModule],
  ...createClinGenTrackSet(),
});

<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />;
```

The preset supplies four tracks and one `trackSets` entry. Add these arrays alongside existing tracks and sets when extending an existing store. Register the four modules (or use `firstPartyTrackModules`). Core owns membership, dragging, visibility, cancellation, and the MUI track-set settings dialog. The preset sets `allowTrackTransfer: false` to keep the four children together. Enable "Allow moving tracks into or out of this set" in the parent settings when needed. Children can still reorder within the set, and the whole set can move.

## Modules and verified sources

Verified on 2026-11-17 against the UCSC hg38 files, their embedded AutoSQL, and [UCSC's track configuration API](https://api.genome.ucsc.edu/list/tracks?genome=hg38;trackLeavesOnly=1). All four support HTTP range access from the browser; no ingestion conversion is needed.

| Export                     | Module type            | Default source                                                                                       | Layout  |
| -------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| `clinGenHaploModule`       | `clingen-haplo`        | [clinGenHaplo.bb](https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenHaplo.bb)             | BED9+17 |
| `clinGenTriploModule`      | `clingen-triplo`       | [clinGenTriplo.bb](https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenTriplo.bb)           | BED9+17 |
| `clinGenGeneDiseaseModule` | `clingen-gene-disease` | [clinGenGeneDisease.bb](https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenGeneDisease.bb) | BED9+9  |
| `clinGenCspecModule`       | `clingen-cspec`        | [clinGenCspec.bb](https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenCspec.bb)             | BED9+3  |

Each module's `create({ base: { id, title, display? }, config: { url? } })` creates an independent track. Default display is `pack`, row height and initial height are 18 pixels. A different source URL must use the same column layout and hg38 coordinates. Other assemblies fail with a descriptive error.

Column counts and ordered AutoSQL names are checked before parsing. Sources without AutoSQL use the declared BED9+N counts and the same positional typed schema. A wrong layout is rejected rather than displayed with misleading fields.

### Schema semantics

The BED9 prefix decodes name, score, strand, thickStart, thickEnd, and item RGB. Coordinates are zero-based, half-open internally; tooltips show one-based inclusive locations. The reader decodes numeric BED fields and keeps annotation fields as the strings their AutoSQL declares. `fields` holds any unparsed columns; these exact schemas consume all declared fields.

- Haploinsufficiency: `url`, `geneSymbol`, `geneId`, `cytoBand`, `dateLastEvaluated`, deprecated `_omimID` and `_omimDesc`, `haploScore`, `haploDescription`, `PMID1` through `PMID6`, `_mouseOver`, and `mondoID`.
- Triplosensitivity: the same dosage fields, with `triploScore` and `triploDescription` replacing the haplo fields. Scores remain source strings, including zero, 30, 40, or not-evaluated values; they are not confused with the BED score.
- Validity: `geneSymbol`, `HGNCid`, `MONDOid`, `Inheritance`, `SOPversion`, `Classification`, `ClinGenURL`, `DateCurated`, and `Mouseover`. The BED name is the associated disease, so one gene can have several overlapping records.
- VCEP: `disease`, `panel`, and `status`. Disease/panel values can contain UCSC HTML links. The original strings remain on the item; presentation uses text and validated HTTP(S) links, without injecting HTML.

[UCSC's ClinGen documentation](https://genome.ucsc.edu/cgi-bin/hgTrackUi?db=hg38&g=clinGenComp) describes the classifications. Colors always come from each record's item RGB. Haplo score 3 is red, triplo score 3 is blue, other dosage scores are gray; validity colors encode classification, and VCEP records are black. No score or classification is inferred from color. The base color picker does not override item RGB.

## Configuration

`ClinGenConfig` is the resolved configuration shared by all four modules.

| Field            | Type             | Default                    | Behavior                                                                                                                   |
| ---------------- | ---------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `url`            | `string`         | Corresponding source above | Absolute HTTP(S) BigBed URL. A change invalidates fetched data.                                                            |
| `rowHeight`      | `number`         | `18`                       | Finite, at least 1 pixel. Visible rows determine track height.                                                             |
| `showLabels`     | `boolean`        | `true`                     | Show available names in Pack/Full; a presentation-only edit.                                                               |
| `maxDetailBases` | positive integer | `5000000`                  | Maximum fetched-region span, including core overscan. Larger spans show a zoom-in message without reading all annotations. |

The settings panel reuses the BigBed base, URL, and row-layout controls. A host-owned source disables its URL field. Child settings remain independent in the track-set dialog.

## Displays and data

`ClinGenDisplay` is `"dense"`, `"pack"`, or `"full"`.

- Dense draws compact rectangles in one row, allowing overlap and omitting labels. Use Pack/Full to select overlapping records independently.
- Pack uses the shared viewport row packer to avoid interval collisions. Labels fit inside the clipped interval, truncating when necessary, so labels do not extend into neighboring records.
- Full gives each visible feature a separate row and keeps offscreen overscan records without inflating visible height. Pack/Full retain disease names or gene/region names from the BED name field.

All modes use core's SVG clipping and fetch-region overscan for panning. Empty tracks occupy one row. At large spans the module displays a zoom-in message rather than substituting a signal graph or misleading annotation summaries.

`ClinGenData` is `{ kind: "features", items: ClinGenItem[] }` or `{ kind: "detail-required" }`. `ClinGenItem` is a discriminated union with `kind: "haplo"`, `"triplo"`, `"gene-disease"`, or `"cspec"`, the corresponding named source fields, and a normalized CSS `color` derived from item RGB. Haplo/triplo/VCEP retain `reserved`; validity retains `itemRgb`.

The modules reuse the existing BigBed reader, per-track reader resources, HTTP range access, core demand caching, and abort signals. Label and membership edits reuse data. Changing display follows core's display-keyed fetching behavior and reuses the same reader metadata.

## Interaction and details

Hover shows coordinates and the source's dosage evidence, validity classification, disease, panel, or status. Click, Enter, or Space opens a MUI feature-details dialog. The dialog shows the track name, hg38 location, relevant annotation fields, safe external links, and an expandable list of nonempty source fields. Escape or Close dismisses it. Changing the dataset/display removes stale details.

Module `create(input, interaction?)` accepts the existing `onClick`, `onHover`, and `onLeave` callbacks with a `ClinGenItem` and current track runtime context. The default details dialog remains available alongside callbacks. ClinGen evidence links follow UCSC's URL templates; VCEP links are extracted from the source's disease/panel fields. Missing values are omitted.

`ClinGenHaploCreateInput`, `ClinGenTriploCreateInput`, `ClinGenGeneDiseaseCreateInput`, and `ClinGenCspecCreateInput` derive from each module's `create` input.

## createClinGenTrackSet

`createClinGenTrackSet({ id?, title?, display? } = {})` returns `{ tracks, trackSets }` for `createTrackStore`. Defaults are ID `clingen`, title `ClinGen`, and display `pack`. Child IDs are `<id>-haplo`, `<id>-triplo`, `<id>-gene-disease`, and `<id>-cspec`. Supply a distinct nonempty ID when adding multiple sets. It creates plain independent instances and membership data; it does not mutate stores or start requests. Registering modules and mounting the browser starts the normal runtime.

See [the module reference](README.md) and [the export index](../README.md#public-export-index) for related APIs.
