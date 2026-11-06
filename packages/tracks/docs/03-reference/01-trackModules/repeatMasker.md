# RepeatMasker

`repeatMaskerModule` offers standard annotations and joined repeats within one track. Import it from `@weng-lab/genomebrowser-tracks/repeatmasker`, or register `firstPartyTrackModules`. It is the RepeatMasker module in the first-party collection.

```ts
import { repeatMaskerModule } from "@weng-lab/genomebrowser-tracks/repeatmasker";

const track = repeatMaskerModule.create({
  base: { id: "repeats", title: "RepeatMasker", display: "full" },
  config: {
    sources: {
      standard: "https://users.wenglab.org/niship/hg38_ucsc_std_rmsk.bb",
      joined: "https://users.wenglab.org/niship/hg38_rmsk.bb",
    },
    view: "standard",
  },
});
```

Both URLs are required and must refer to the same assembly. Sources need CORS and HTTP byte-range support. The module fetches only the selected source. Switching views preserves display mode and configuration; it does not merge or deduplicate the two datasets. Reader metadata is retained per source for the lifetime of the mounted track, while core owns cancellation and ignores superseded results. Source errors remain errors rather than switching to a different dataset.

## Views and displays

Use the MUI **Annotation view** dropdown in settings to select:

- **Standard annotations** (`view: "standard"`): validated UCSC BED6+11, with 17 fields and 6 standard fields. Full shows ten class bands and highlights every subrow when its class label is hovered. Pack stacks intervals compactly. Dense shows aggregated interval coverage. Full and Pack grayscale represents `milliDiv + milliDel + milliIns`, with lighter repeats having more differences.
- **Joined repeats** (`view: "joined"`): bigRmsk BED9+5, with 14 fields and 9 standard fields. Full shows individual repeat models, aligned fragments, joins, and optional unaligned consensus extents. Grayscale represents divergence from `score / 10`. Pack retains joined fragments in compact rows with repeat-class colors. Dense shows colored aligned blocks.

Full is the default display; every view supports Full, Pack, and Dense. Both views provide their own geometry, labels, packing, shading, and tooltips within this module. Raw attributes retain their source-specific meaning; the standard error percentages and joined divergence score are not interchangeable.

## Source schemas and decoded records

Both sources use zero-based, half-open `chromosome`, `start`, and `end` coordinates. File layouts are selected explicitly by `view`, never inferred from filenames. The module supplies the typed positional schemas; no `bedSchema` option is needed. Transport errors, malformed fields, inconsistent layouts, and cancellation reject the fetch.

### Standard annotations

The source must declare 17 fields, with 6 standard BED fields (BED6+11). If embedded AutoSQL exists, its ordered names must match the known UCSC schema. Without AutoSQL, the validated 17/6 header uses the known mapping.

Named fields after BED3, in order, are `name`, `score`, `strand`, `swScore`, `milliDiv`, `milliDel`, `milliIns`, `genoLeft`, `repClass`, `repFamily`, `repStart`, `repEnd`, `repLeft`, and `repeatId`. Numeric values are validated as 32-bit integers with UCSC signedness. Original classes and families, including uncertain `?` suffixes, are preserved. Detailed records add `kind: "repeat"` and a normalized `category`.

Full display groups records into ten bands in this order: SINE, LINE, LTR, DNA, Simple, Low_complexity, Satellite, RNA, Other, Unknown. Grouping strips a trailing `?`, maps `Simple_repeat` to Simple, groups RNA classes into RNA, and maps other classes to Other, with empty classes mapped to Unknown. Overlapping annotations occupy separate subrows within their class. Repeat names fit within the annotation bounds and avoid the class heading. Class headings use core `TrackLabel` annotations in the stationary plot overlay, so they stay fixed during live panning. Their hover target and full-width band highlight share that overlay; hovering highlights every subrow in the class without React state changes. Class headings are omitted when a band is shorter than the label height. Dense display always aggregates records to at most one coverage cell per logical plot pixel, including small queries. Overlapping annotations contribute to coverage and mean-overlap summaries without depending on record order. Use Full or Pack to inspect individual repeats.

Detail grayscale becomes lighter as `milliDiv + milliDel + milliIns` increases, saturating at 500 (50%). Tooltips show the raw class and family, coordinates, strand, Smith-Waterman score, divergence/deletion/insertion percentages (`milli* / 10`), consensus coordinates, genome-left offset, and repeat ID. Summary targets contain `kind: "summary"`, genomic coordinates, `validCount`, and `mean`; their tooltips show estimated coverage and mean overlapping feature count. For detailed Standard data, `validCount` measures the union of covered bases in each cell, counting overlapping bases once; `mean` divides the summed repeat overlap by that union. Cell shading reflects the fraction covered. Stored zoom summaries estimate covered positions uniformly within each source bin.

### Joined repeats

The source must declare the bigRmsk BED9+5 layout: 14 fields, with 9 standard BED fields. Fields after BED3 are `name`, `score`, `strand`, `thickStart`, `thickEnd`, `reserved`, `blockCount`, `blockSizes`, `blockStarts`, `id`, and `description`. The ninth column is a numeric reserved value rather than an RGB color. These records are not ordinary BED12.

Block arrays accept a trailing comma and contain signed integers. A block start of `-1` identifies unaligned consensus sequence; signed sizes on these blocks can describe consensus overlap. Validation checks array lengths, aligned block sizes, ordering, and bounds against `thickStart` and `thickEnd`. Records without aligned blocks draw no coverage.

Decoded records retain all named source fields and add `repeatName`, `repeatClass`, `repeatFamily`, and `alignedBlocks`. Source `name` uses `repeatName#class/family`; missing classification becomes Unknown and an absent family becomes an empty string. `alignedBlocks` contains zero-based genomic regions. Raw visualization bounds must not be interpreted as aligned coverage. Unconsumed trailing values remain in `fields`.

Full display caps each terminal consensus extension at 120 logical pixels and labels the unaligned length when space allows. Dashed context is not genomic repeat coverage. Fragment joins show missing consensus sequence with dashed connections and consensus overlap with angled connections. Pack and Dense use repeat-class colors; the arbitrary base color does not override annotation shading or the class palette. Row height follows the visible rows while retaining overscan annotations for panning.

Joined tooltips show repeat name, class, family, aligned region, strand, divergence (`score / 10` percent), aligned fragment count, and repeat ID. The optional bigRmskAlign companion file and pairwise alignment detail view are not loaded.

## Configuration and settings

| Field                   | Default      | Meaning                                                            |
| ----------------------- | ------------ | ------------------------------------------------------------------ |
| `sources.standard`      | required     | Standard UCSC rmsk BED6+11 URL.                                    |
| `sources.joined`        | required     | Joined bigRmsk BED9+5 URL.                                         |
| `view`                  | `"standard"` | Active source and presentation: `"standard"` or `"joined"`.        |
| `rowHeight`             | `24`         | Logical pixels per row, minimum 1.                                 |
| `showLabels`            | `true`       | Show repeat names in Full and Pack when space allows.              |
| `showStrandArrows`      | `true`       | Show strand chevrons inside aligned rectangles when space allows.  |
| `highlightClassOnHover` | `true`       | Highlight class subrows when hovering a Standard Full class label. |
| `showUnalignedExtents`  | `true`       | Display unaligned consensus extents in Joined Full.                |
| `maxDetailBases`        | `1000000`    | Maximum requested span for individual records; positive integer.   |

Base settings control title, display, height, and row height. Source URLs and the detail limit appear in a separate settings section. Host-owned source URLs are read-only. View-specific controls appear only in the applicable Full view, and retain their values while hidden. Visual controls do not refetch data; view, URL, and detail-limit changes invalidate the fetched result.

## Wide regions

For either source, requests beyond `maxDetailBases` use indexed BigBed zoom summaries. The selected reduction is the largest stored level no greater than half a logical pixel's genomic span, or the smallest available level. The summary is neutral coverage with a zoom-in prompt, bounded to at most one cell per logical plot pixel. It cannot show class, names, strand, or joined fragment structure. Joined summaries describe the file's indexed intervals, including their visualization bounds; they must not be interpreted as exact aligned-fragment coverage.

Files without zoom levels show the prompt without reading raw records at wide scales. The threshold applies to the requested render region, including overscan, so the visible span can be smaller than the configured limit. Malformed layouts or annotations produce track errors through the existing reader and validators.

## Tooltips, interactions, and types

Callbacks receive a `RepeatMaskerItem`, the original typed standard repeat, joined repeat, or summary item. Joined records have `alignedBlocks`; standard detail records have `kind: "repeat"`; summaries have `kind: "summary"`. The callback context retains type `repeatmasker`, both URLs, the active view, and all current settings. Tooltip dispatch follows the hovered item shape, including during a view change.

Public types from this subpath:

- `RepeatMaskerCreateInput`: validated factory input; both source URLs required.
- `RepeatMaskerDisplay`: `"full" | "pack" | "dense"`.
- `RepeatMaskerConfig`: the resolved configuration above.
- `RepeatMaskerItem`: union of the standard repeat, joined repeat, and coverage summary shapes described above.
- `RepeatMaskerData`: source-tagged result. Standard data has `{ view: "standard", url, data }`; joined detail has `{ view: "joined", url, data }`; joined coverage or zoom prompts have `{ view: "joined-summary", url, data }`. The URL identifies the fetched source so stale results cannot be rendered under a replacement URL. Standard and summary `data` use `{ kind: "repeats", repeats }`, `{ kind: "summary", summaries }`, or `{ kind: "detail-required" }`; joined detail `data` is an array of joined repeats.

Save the track's type, base, config, and source with other track configuration. Multiple RepeatMasker track instances keep independent settings and source resources.

Return to [Track modules](README.md).
