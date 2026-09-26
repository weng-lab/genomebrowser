# BAM alignments

Use `bamModule` for coordinate-sorted BAM files with matching BAI indexes. One track shows up to three sections from the same loaded alignments: a coverage graph of per-base depth, splice-junction arcs labeled with their supporting alignment counts, and individual strand-colored alignments with CIGAR blocks and read tooltips.

## Usage

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bamModule } from "@weng-lab/genomebrowser-tracks/bam";

const useTrackStore = createTrackStore({
  modules: [bamModule],
  tracks: [
    bamModule.create({
      base: { id: "alignments", title: "Alignments", display: "pack" },
      config: {
        url: "YOUR_URL_HERE",
        indexUrl: "YOUR_URL_HERE",
        coverage: { show: true },
        junctions: { show: true, minimumSupport: 2 },
        alignments: { show: true, rowHeight: 14 },
      },
    }),
  ],
});
```

Supply separate HTTP(S) URLs for the BAM and its BAI. The BAM must use the browser assembly. Exact reference names take priority; if absent, the BAM reader tries adding or removing `chr`. A browser region named `chr20` therefore matches a BAM reference named `20`, with returned alignments using `chr20`. This changes names only, not coordinates or assembly. Optional reference sequence names must still match the browser exactly.

The track shows **Zoom in to see BAM track** in place of every section when the visible browser region reaches `config.maxWindow` (default 50,000 bp). Fetching uses this same visible span; overscan does not count toward the limit. Below the limit, reads are fetched for the expanded render region. Configure an integer from 1 through 100,000 bp.

## bamModule

`bamModule.create(input, interaction?)` returns a track with `type: "bam"`. Register the module before adding its instances. See [Create and validate tracks](trackCreation.md) for shared input validation and ownership.

The package root's `firstPartyTrackModules` includes BAM. The individual `/bam` entry loads only this track implementation.

## Sections

Sections appear top to bottom in this order: coverage, splice junctions, alignments. `config.coverage.show`, `config.junctions.show`, and `config.alignments.show` choose which appear. By default the track shows coverage above the alignments. Hidden sections take no space, and 4 pixels separate visible sections. At least one section must remain shown; a config that hides all three fails validation.

| Sections shown                  | Result                                     |
| ------------------------------- | ------------------------------------------ |
| Coverage, alignments            | Default. Depth above the individual reads. |
| Alignments                      | Individual reads only.                     |
| Coverage                        | Depth graph only.                          |
| Coverage, junctions             | Sashimi-style depth with junction arcs.    |
| Coverage, junctions, alignments | Depth, junction support, and the reads.    |

Every section draws from the same loaded records after the same filters, so coverage, junction counts, and drawn reads agree about which alignments exist. Changing which sections appear, or any section setting, reuses the loaded records without a new request.

### Coverage

Coverage is per-base depth: the number of filtered alignments with an aligned base at each reference position. Only CIGAR `M`, `=`, and `X` blocks add depth. Deletions (`D`) and skipped reference regions (`N`) do not, so an intron reads as uncovered. Insertions and clips consume no reference positions and add no depth.

When the visible region has fewer bases than the track has pixels, each base is plotted on its own. Otherwise each pixel summarizes the whole bases it covers using `coverage.aggregation`: `mean` plots average depth and `max` plots the deepest base. The summary changes only what is plotted; it never changes the underlying per-base counts. `coverage.graph` draws `bars`, a filled step graph, or `line`, which connects bin centers.

The graph baseline is always zero. With `coverage.scale` set to `{ mode: "auto" }`, the top of the graph is the largest plotted value within the visible region, ignoring off-screen overscan, with a minimum of 1. With `{ mode: "fixed", max }`, values above `max` are drawn at the top of the graph. Scale labels show the maximum and zero.

Hovering the graph highlights one plotted bin. For a single base, the tooltip shows its location and depth. For a summarized bin, the tooltip titles the number of bases and shows mean and maximum depth across them.

### Splice junctions

A splice junction is a distinct CIGAR `N` operation, identified by its chromosome, start, and end. Its support is the number of filtered alignments containing that exact skipped region. Junctions with less support than `junctions.minimumSupport`, or with a span longer than `junctions.maximumSpan` when that is set, are hidden. An alignment reaches every junction it contains, so a junction's support does not change as the view moves, provided any part of the junction lies in the loaded region.

Each junction draws one arc above a shared baseline. Arc thickness grows with the logarithm of support, relative to the best-supported junction shown. Arc height grows with the arc's on-screen width, so nested junctions stay distinct. With `junctions.showCounts`, labels show support above each arc. They are placed highest support first, and any label that would overlap one already placed is omitted. Hovering an arc shows its skipped region, span, and support whether or not it has a label.

Arcs do not indicate transcript strand. Alignment orientation depends on library preparation, so the track does not infer strand from it.

### What the counts measure

Coverage and junction support count alignment records, not unique molecules or fragments. Overlapping mates from the same fragment each contribute depth where they overlap, and both mates count toward a junction they both span. Secondary alignments (SAM flag 0x100) place the same read at another locus and count at that locus. Supplementary alignments (0x800) count for the part of the read they align. Quality-failed records (0x200) count too. Duplicates (0x400) count unless `filters.includeDuplicates` is `false`. `filters.minimumMappingQuality` removes low-confidence and multimapping alignments from every section.

## Read layouts and base defaults

| Display          | Behavior                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `dense`          | Overlays all alignments in one row without names or base letters. Overlapping reads can obscure each other.                               |
| `squish`         | Packs nonoverlapping alignments into compact rows at half the configured row height, with a minimum of 1 pixel. No names or base letters. |
| `pack` (default) | Packs alignments at the configured row height, with read names to the right of each read. Names take part in packing.                     |
| `full`           | Gives each alignment its own row, with names to the right. Reads in the viewport take the top rows, so rows change as the view moves.     |

`base.display` arranges the alignments section only. Hiding the alignments keeps the selected layout for when they are shown again. Names appear when the row height is at least 10 pixels.

In squish and pack, a read's row does not depend on the viewport, so reads stay on their rows while panning. When a pan loads new data, reads that remain keep their rows where possible and new reads take the first free row. Zooming, or changing the display, repacks every read. Because rows are not reordered for the viewport, a visible read can sit below rows that are empty in view.

The initial base height is `14`. The renderer replaces it with the sum of the visible sections: the configured coverage and junction heights, plus the alignment rows down to the lowest row with a read in the visible viewport. Overscan reads remain available for panning without increasing that height. An empty alignments section retains one row. Status messages add a 14-pixel line above the sections.

Squish, pack, and full draw at most `alignments.maxRows` rows (100 by default). Long reads that each span most of the view can otherwise need one row per read. Reads that do not fit are not drawn, and a line below the alignments reports how many visible alignments were left out. Coverage and junction counts always include every filtered alignment. Dense draws a single row and is not limited.

`config.alignments.forwardColor`, default `#3366cc`, colors forward-strand reads. `config.alignments.reverseColor`, default `#cc3333`, colors reverse-strand reads. Both use darker interiors for aligned blocks, with strand-colored outlines and direction marks. These conventions are inspired by [UCSC BAM strand coloring](https://www.genome.ucsc.edu/goldenPath/help/hgBamTrackHelp), rather than implementing every UCSC BAM setting.

### Alignment structure and bases

CIGAR `M`, `=`, and `X` operations draw aligned blocks. Deletions (`D`) draw solid connectors; skipped reference regions (`N`) draw dashed connectors. Insertions (`I`) use purple ticks. Soft clips (`S`) use strand-colored ticks at their reference anchor; they are not stretched into reference coordinates. Hard clips and padding consume no reference space and draw no blocks. A read without CIGAR operations draws as an unfilled outline over its reference span.

In pack and full, bases appear when the shared browser gate enables detail and row height is at least 10. Sequence is drawn in stored BAM orientation, including for reverse-strand reads. CIGAR `X` blocks are highlighted red at every zoom.

The host sets `basePairDetail.maxVisibleBases` in `createBrowserStore`, or changes it with `setBasePairDetail`. The default is 100 visible bp, inclusive. Core's `useBasePairDetail()` enables letters at 8 logical SVG units per base and keeps them visible down to 6. Overscan does not affect the gate; resizing uses the actual plot width. Responsive UI scale changes logical width, while fixed sizing scale leaves the gate unchanged.

An optional `sequenceUrl` supplies a version-0 UCSC 2bit reference. The reference is fetched within the browser's bp cutoff, including overscan, even when the width guard hides letters. The last successful reference window is reused during resizing. When letters are visible, the track compares canonical A/C/G/T bases in `M` operations with the reference and highlights mismatches in bright red. Lowercase reference bases are compared without case sensitivity. Ambiguous bases are not treated as confirmed mismatches. Without reference data, `M` operations are not assumed to match or mismatch; only explicit `X` operations establish mismatches.

Each alignment is rendered separately. Mate coordinates appear in tooltips; the track does not join paired reads into fragments.

## Config

| Option                          | Type                 | Default            | Description                                                                                                                                                                               |
| ------------------------------- | -------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`                           | `string`             | Required           | Nonempty BAM URL. Changing it requests new data.                                                                                                                                          |
| `indexUrl`                      | `string`             | Required           | Nonempty matching BAI URL. Changing it replaces the retained BAM reader and requests data.                                                                                                |
| `sequenceUrl`                   | `string`             | Unset              | HTTP(S) 2bit reference URL for the same assembly. Changing it requests new data.                                                                                                          |
| `maxWindow`                     | `number`             | `50000`            | Exclusive visible-span limit for display and fetching, independent of overscan. Integer from 1 through 100000. At or above the limit, shows a zoom-in message. Changing it requests data. |
| `filters.minimumMappingQuality` | `number`             | `0`                | Integer from 0 through 254, applied to every section. Zero includes unavailable MAPQ 255; positive thresholds exclude unavailable MAPQ.                                                   |
| `filters.includeDuplicates`     | `boolean`            | `true`             | Whether records with SAM duplicate flag 0x400 appear in every section.                                                                                                                    |
| `coverage.show`                 | `boolean`            | `true`             | Whether the coverage section appears.                                                                                                                                                     |
| `coverage.height`               | `number`             | `60`               | Coverage section height in pixels. Integer from 10 through 1000.                                                                                                                          |
| `coverage.color`                | `string`             | `#808080`          | Six-digit hexadecimal color for the graph.                                                                                                                                                |
| `coverage.scale`                | `BamCoverageScale`   | `{ mode: "auto" }` | `{ mode: "auto" }` scales to the visible peak. `{ mode: "fixed", max }` uses a positive finite maximum.                                                                                   |
| `coverage.graph`                | `"bars"` or `"line"` | `"bars"`           | Filled step graph or connected line.                                                                                                                                                      |
| `coverage.aggregation`          | `"mean"` or `"max"`  | `"mean"`           | How a pixel summarizes the bases it covers when zoomed out.                                                                                                                               |
| `junctions.show`                | `boolean`            | `false`            | Whether the splice-junction section appears.                                                                                                                                              |
| `junctions.height`              | `number`             | `100`              | Junction section height in pixels. Integer from 10 through 1000.                                                                                                                          |
| `junctions.color`               | `string`             | `#808080`          | Six-digit hexadecimal arc color. Labels and hovered arcs use a darker shade.                                                                                                              |
| `junctions.minimumSupport`      | `number`             | `1`                | Integer of at least 1. Hides junctions with fewer supporting alignments.                                                                                                                  |
| `junctions.maximumSpan`         | `number`             | Unset              | Positive integer. When set, hides junctions whose skipped region is longer, in bp.                                                                                                        |
| `junctions.showCounts`          | `boolean`            | `true`             | Whether support labels appear above arcs.                                                                                                                                                 |
| `alignments.show`               | `boolean`            | `true`             | Whether the alignments section appears.                                                                                                                                                   |
| `alignments.rowHeight`          | `number`             | `14`               | Complete row slot in pixels, finite and at least 1. Squish uses half this value.                                                                                                          |
| `alignments.forwardColor`       | `string`             | `#3366cc`          | Forward-strand color, a six-digit hex value. Independent of the generic base color.                                                                                                       |
| `alignments.reverseColor`       | `string`             | `#cc3333`          | Six-digit hexadecimal color for reverse-strand alignments.                                                                                                                                |
| `alignments.maxRows`            | `number`             | `100`              | Maximum alignment rows drawn in squish, pack, and full. Integer from 1 through 10000. Undrawn reads still count toward coverage and junctions.                                            |

The fetcher retains one BAM reader keyed by both source URLs and one optional reference reader keyed by its URL, using resources scoped to the mounted track. It does not retain alignment regions. Render-only changes such as section visibility, colors, heights, scale, junction thresholds, row height, mapping-quality filtering, and duplicate filtering reuse current records.

The region limit controls genomic span, not read count. The row limit bounds how many reads are drawn. Each drawn read uses a fixed number of SVG elements, whatever its CIGAR length, because operations closer than a pixel are merged.

`BamConfigInput` accepts optional `filters`, `coverage`, `junctions`, and `alignments` objects. Omitted groups, empty groups, and omitted fields receive the defaults above. `BamConfig` is the fully parsed configuration. Track patches are shallow, so a patched group replaces the current group, and its omitted fields return to their defaults. Supply every field you want to keep:

```ts
const result = useTrackStore.getState().updateTrack("alignments", {
  config: { filters: { minimumMappingQuality: 20, includeDuplicates: false } },
});
if (!result.ok) console.error(result.error);
```

## Settings

The form edits title, display mode, section visibility, the settings of each shown section, mapping-quality threshold, duplicate visibility, all three source URLs, and the visible-span limit. Controls for a hidden section are removed from the form, and its settings are kept for when it is shown again. The switch for the last shown section is disabled. URL drafts apply only when Set is activated. Host-owned tracks disable all source URL fields while keeping presentation controls available. Height is calculated from the shown sections; edit a section height, Row height, or Maximum rows to resize the track.

The **Sequence letters** section shares its setting with all participating tracks. Its slider runs from larger letters to more bases and edits the browser's `basePairDetail.maxVisibleBases` cutoff immediately. The displayed span and slider range account for the mounted plot width; an existing preference above that range is preserved until the user moves the slider. The sample bases illustrate density and are not reference data.

**Show letters** centers the viewport on the displayed, readable span. The control shows track-specific prerequisites when the source or display mode prevents letters. Host-owned tracks can still edit this display preference.

## Tooltip and interactions

Coverage and junction tooltips are described under [Sections](#sections). The alignment tooltip shows read name, zero-based half-open location, strand, MAPQ, sequence length, reference span, CIGAR, numeric and decoded SAM flags, mate location and orientation, signed template length, mean base quality, and stored sequence. MAPQ 255, absent qualities, and empty CIGARs are labeled unavailable. Tooltip values wrap into lines of at most 32 characters, preferring spaces where available. CIGAR and sequence previews remain shortened after 80 characters.

Click, hover, and leave callbacks fire for alignments only and receive the complete `BamRecord` and core's track context. Coverage bins and junction arcs show tooltips without calling interaction callbacks. Their records retain full sequences and CIGAR operations even when tooltip previews are shortened.

```ts
import { bamModule, type BamInteraction } from "@weng-lab/genomebrowser-tracks/bam";

const interaction: BamInteraction = {
  onClick(record) {
    console.info(record.readName, record.cigar, record.mate);
  },
};

const track = bamModule.create(
  {
    base: { id: "reads", title: "Reads" },
    config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
  },
  interaction,
);
```

## Data and exported types

| Export             | Contract                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `BamCreateInput`   | Input to `bamModule.create`, with optional defaulted config values.                                                                        |
| `BamConfigInput`   | Authored configuration with optional alignment and filter groups.                                                                          |
| `BamConfig`        | Parsed config with the defaults above applied.                                                                                             |
| `BamCoverageScale` | `{ mode: "auto" }` or `{ mode: "fixed"; max: number }`, the type of `coverage.scale`.                                                      |
| `BamDisplay`       | `"dense" \| "squish" \| "pack" \| "full"`, the alignment layout.                                                                           |
| `BamData`          | Fetch result: `records: BamRecord[]`, `reference: TwoBitRecord[]`, optional `message` for the region limit, and optional `referenceError`. |
| `BamInteraction`   | Core interaction callbacks for `BamRecord` and `BamConfig`.                                                                                |
| `BamRecord`        | Re-export of the reader's alignment record, described below.                                                                               |

`BamRecord` contains `chromosome`, `start`, `end`, `readName`, numeric `flags`, `strand: "+" | "-"`, `mappingQuality`, signed `templateLength`, `sequence`, `phredQualities: number[] | null`, `cigar`, and `mate`. Each CIGAR operation has `op`, `length`, `sequenceOffset`, and `referenceOffset`. Mate is null when its reference is absent, otherwise it has `chromosome`, zero-based `start` (or -1), `strand`, and `unmapped`. Records use zero-based, half-open coordinates.

Each reference record contains `chromosome`, `start`, `end`, and `sequence`. The installed reader package's `docs/03-reference/bam/bam.md` describes the full file-reading contract.

## Source requirements and failures

BAM must be coordinate-sorted, BGZF-compressed, and paired with its matching BAI index. BAM and optional 2bit requests require HTTP 206 byte ranges without transport `Content-Encoding`; the BAI is fetched in full. All sources need browser CORS access.

The reader supports BAI, not CSI or CRAM. It decodes long CIGARs from the `CG` tag; when that tag is missing or inconsistent, the read keeps its span with no CIGAR operations. Regional coordinates must end at or before `2 ** 29`. Unmapped reads are omitted; secondary, supplementary, and quality-failed records remain visible and counted unless filtered by MAPQ or duplicate settings.

BAM or index errors use core's track error display. Optional reference failures preserve alignments and add a status message. Missing BAM chromosomes return no alignments. See [Data source troubleshooting](../../04-troubleshooting.md).

Return to [Track modules](README.md) or [Tracks API reference](../README.md).
