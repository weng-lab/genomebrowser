# BAM alignments

Use `bamModule` for coordinate-sorted BAM files with matching BAI indexes. The four displays draw strand-colored alignments with CIGAR blocks, gaps, and detailed read tooltips.

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
        alignments: { rowHeight: 14, forwardColor: "#3366cc", reverseColor: "#cc3333" },
        filters: { includeDuplicates: true },
      },
    }),
  ],
});
```

Supply separate HTTP(S) URLs for the BAM and its BAI. The BAM must use the browser assembly. Exact reference names take priority; if absent, the BAM reader tries adding or removing `chr`. A browser region named `chr20` therefore matches a BAM reference named `20`, with returned alignments using `chr20`. This changes names only, not coordinates or assembly. Optional reference sequence names must still match the browser exactly.

All four displays show **Zoom in to see BAM track** when the visible browser region reaches `config.maxWindow` (default 50,000 bp). Fetching uses this same visible span; overscan does not count toward the limit. Below the limit, reads are fetched for the expanded render region. Configure an integer from 1 through 100,000 bp.

## bamModule

`bamModule.create(input, interaction?)` returns a track with `type: "bam"`. Register the module before adding its instances. See [Create and validate tracks](trackCreation.md) for shared input validation and ownership.

The package root's `firstPartyTrackModules` includes BAM. The individual `/bam` entry loads only this track implementation.

## Displays and base defaults

| Display          | Behavior                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `dense`          | Overlays all alignments in one row without names or base letters. Overlapping reads can obscure each other.                               |
| `squish`         | Packs nonoverlapping alignments into compact rows at half the configured row height, with a minimum of 1 pixel. No names or base letters. |
| `pack` (default) | Packs alignments at the configured row height. Read-name labels participate in packing when they fit inside the viewport.                 |
| `full`           | Gives each alignment its own row, with names when space permits.                                                                          |

The initial base height is `14`. Each renderer replaces it with the height of the rows needed in the visible viewport. Overscan reads remain available for panning without increasing that height. Empty displays retain at least one row. Status messages reserve additional rows.

`config.alignments.forwardColor`, default `#3366cc`, colors forward-strand reads. `config.alignments.reverseColor`, default `#cc3333`, colors reverse-strand reads. Both use darker interiors for aligned blocks, with strand-colored outlines and direction marks. These conventions are inspired by [UCSC BAM strand coloring](https://www.genome.ucsc.edu/goldenPath/help/hgBamTrackHelp), rather than implementing every UCSC BAM setting.

### Alignment structure and bases

CIGAR `M`, `=`, and `X` operations draw aligned blocks. Deletions (`D`) draw solid connectors; skipped reference regions (`N`) draw dashed connectors. Insertions (`I`) use purple ticks. Soft clips (`S`) use strand-colored ticks at their reference anchor; they are not stretched into reference coordinates. Hard clips and padding consume no reference space and draw no blocks.

In pack and full, bases appear when the visible span is at most `alignments.sequenceMaxWindow` (100 bp by default), when the row height is at least 10. Sequence is drawn in stored BAM orientation, including for reverse-strand reads. CIGAR `X` blocks are highlighted red at every zoom.

An optional `sequenceUrl` supplies a version-0 UCSC 2bit reference. The reference is fetched with alignments, including outside the visible viewport, so zooming into retained data can highlight mismatches. When letters are visible, the track compares canonical A/C/G/T bases in `M` operations with the reference and highlights mismatches in bright red. Lowercase reference bases are compared without case sensitivity. Ambiguous bases are not treated as confirmed mismatches. Without reference data, `M` operations are not assumed to match or mismatch; only explicit `X` operations establish mismatches.

Each alignment is rendered separately. Mate coordinates appear in tooltips; the track does not join paired reads into fragments or calculate a coverage graph.

## Config

| Option                          | Type      | Default   | Description                                                                                                                                                                               |
| ------------------------------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`                           | `string`  | Required  | Nonempty BAM URL. Changing it requests new data.                                                                                                                                          |
| `indexUrl`                      | `string`  | Required  | Nonempty matching BAI URL. Changing it replaces the retained BAM reader and requests data.                                                                                                |
| `sequenceUrl`                   | `string`  | Unset     | HTTP(S) 2bit reference URL for the same assembly. Changing it requests new data.                                                                                                          |
| `maxWindow`                     | `number`  | `50000`   | Exclusive visible-span limit for display and fetching, independent of overscan. Integer from 1 through 100000. At or above the limit, shows a zoom-in message. Changing it requests data. |
| `alignments.sequenceMaxWindow`  | `number`  | `100`     | Maximum visible span in bp for letters, inclusive. Integer from 1 to 100000, independent of ruler settings and plot width.                                                                |
| `alignments.rowHeight`          | `number`  | `14`      | Complete row slot in pixels, finite and at least 1. Squish uses half this value.                                                                                                          |
| `alignments.forwardColor`       | `string`  | `#3366cc` | Forward-strand color, a six-digit hex value. Independent of the generic base color.                                                                                                       |
| `alignments.reverseColor`       | `string`  | `#cc3333` | Six-digit hexadecimal color for reverse-strand alignments.                                                                                                                                |
| `filters.minimumMappingQuality` | `number`  | `0`       | Integer from 0 through 254. Filters loaded records locally. Zero includes unavailable MAPQ 255; positive thresholds exclude unavailable MAPQ.                                             |
| `filters.includeDuplicates`     | `boolean` | `true`    | Whether to include records with SAM duplicate flag 0x400. Filters loaded records locally.                                                                                                 |

The fetcher retains one BAM reader keyed by both source URLs and one optional reference reader keyed by its URL, using resources scoped to the mounted track. It does not retain alignment regions. Render-only changes such as colors, row height, mapping-quality filtering, and duplicate filtering reuse current records.

The region limit controls genomic span, not read count. High-depth regions and full display can still produce many SVG elements.

`BamConfigInput` accepts optional `alignments` and `filters` objects. Omitted groups, empty groups, and omitted fields receive the defaults above. `BamConfig` is the fully parsed configuration. Track patches are shallow, so a patched `alignments` or `filters` group replaces the current group, and its omitted fields return to their defaults. Supply every field you want to keep:

```ts
const result = useTrackStore.getState().updateTrack("alignments", {
  config: { filters: { minimumMappingQuality: 20, includeDuplicates: false } },
});
if (!result.ok) console.error(result.error);
```

## Settings

The form edits title, display mode, forward and reverse colors, row height, all three source URLs, mapping-quality threshold, duplicate visibility, and the visible-span limit. URL drafts apply only when Set is activated. Host-owned tracks disable all source URL fields while keeping presentation controls available. Height is calculated from the display and visible rows; edit Row height to resize alignments.

## Tooltip and interactions

The tooltip shows read name, zero-based half-open location, strand, MAPQ, sequence length, reference span, CIGAR, numeric and decoded SAM flags, mate location and orientation, signed template length, mean base quality, and stored sequence. MAPQ 255 and absent qualities are labeled unavailable. Tooltip values wrap into lines of at most 32 characters, preferring spaces where available. CIGAR and sequence previews remain shortened after 80 characters.

Click, hover, and leave callbacks receive the complete `BamRecord` and core's track context. Their records retain full sequences and CIGAR operations even when tooltip previews are shortened.

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

| Export           | Contract                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `BamCreateInput` | Input to `bamModule.create`, with optional defaulted config values.                                                                        |
| `BamConfigInput` | Authored configuration with optional alignment and filter groups.                                                                          |
| `BamConfig`      | Parsed config with the defaults above applied.                                                                                             |
| `BamDisplay`     | `"dense" \| "squish" \| "pack" \| "full"`.                                                                                                 |
| `BamData`        | Fetch result: `records: BamRecord[]`, `reference: TwoBitRecord[]`, optional `message` for the region limit, and optional `referenceError`. |
| `BamInteraction` | Core interaction callbacks for `BamRecord` and `BamConfig`.                                                                                |
| `BamRecord`      | Re-export of the reader's alignment record, described below.                                                                               |

`BamRecord` contains `chromosome`, `start`, `end`, `readName`, numeric `flags`, `strand: "+" | "-"`, `mappingQuality`, signed `templateLength`, `sequence`, `phredQualities: number[] | null`, `cigar`, and `mate`. Each CIGAR operation has `op`, `length`, `sequenceOffset`, and `referenceOffset`. Mate is null when its reference is absent, otherwise it has `chromosome`, zero-based `start` (or -1), `strand`, and `unmapped`. Records use zero-based, half-open coordinates.

Each reference record contains `chromosome`, `start`, `end`, and `sequence`. The installed reader package's `docs/03-reference/bam/bam.md` describes the full file-reading contract.

## Source requirements and failures

BAM must be coordinate-sorted, BGZF-compressed, and paired with its matching BAI index. BAM and optional 2bit requests require HTTP 206 byte ranges without transport `Content-Encoding`; the BAI is fetched in full. All sources need browser CORS access.

The reader supports BAI, not CSI or CRAM, and rejects long-CIGAR placeholders. Regional coordinates must end at or before `2 ** 29`. Unmapped reads are omitted; secondary, supplementary, and quality-failed records remain visible unless filtered by MAPQ or duplicate settings.

BAM or index errors use core's track error display. Optional reference failures preserve alignments and add a status message. Missing BAM chromosomes return no alignments. See [Data source troubleshooting](../../04-troubleshooting.md).

Return to [Track modules](README.md) or [Tracks API reference](../README.md).
