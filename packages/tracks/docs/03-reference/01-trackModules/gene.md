# Gene

Use `geneModule` for transcript annotations stored in a standard BigGenePred or expanded BigGenePredPlusV1 BigBed file. The track can draw every transcript, transcripts matching configured tags, or one merged structure per gene.

## Usage

```ts
import { geneModule } from "@weng-lab/genomebrowser-tracks/gene";

const track = geneModule.create({
  base: {
    id: "genes",
    title: "Genes",
  },
  config: { url: "YOUR_URL_HERE" },
});
```

## geneModule

`geneModule.create(input, interaction?)` returns a track with `type: "gene"`. Register `geneModule` with the track store before adding its instances. See [Create and validate tracks](trackCreation.md) for required base fields, source ownership, schemas, and validation errors.

## Displays and base defaults

| Field     | Supported or default                       | Behavior                                                                                                                         |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `display` | `"full"` (default), `"merged"`, `"tagged"` | Full draws all transcripts. Merged draws one grouped union per gene. Tagged draws transcripts matching any configured tag color. |
| `height`  | `12`                                       | The renderer replaces this with packed row count times `rowHeight`.                                                              |
| `color`   | `"#4b9560"`                                | Fill and stroke color for transcripts that do not match a configured tag.                                                        |

### Transcript structure

Full and tagged draw each intron as a line with chevrons pointing in the transcript's strand direction. Exons are rectangles. For a coding transcript, intersection with the half-open `thickStart` to `thickEnd` interval produces tall CDS segments. Exon sequence outside that interval produces shorter UTR segments classified as 5-prime or 3-prime from the transcript strand. When `thickStart` equals `thickEnd`, every exon is a shorter noncoding-exon segment.

### Tags and highlighting

A transcript uses the first `tagColors` entry that exactly matches one of its source tags. Matching is case-sensitive. Full display also draws unmatched transcripts in the base color. Tagged display omits them, so an empty tag list draws nothing. Standard BigGenePred has no tags and produces an empty tagged display.

Gene-name highlighting overrides tag colors. Merged display combines all source transcripts without applying tag colors. Exon coverage replaces overlapping intron coverage. For overlapping exon categories, CDS takes precedence over UTR, which takes precedence over noncoding exon.

### Labels and height

Full and tagged label each transcript with its normalized `transcriptName`. Merged uses the gene name. A label appears to the right when space permits, otherwise to the left. The renderer hides it when neither side fits inside the viewport. Label bounds participate in row packing.

All displays derive total height from rows needed by features that intersect the visible viewport. Features fetched on either side remain packed and rendered for panning, but they do not make the track taller. Panning into denser or sparser annotations changes total height while preserving `rowHeight`.

## Config

| Option           | Type             | Default                                      | Description                                                                                         |
| ---------------- | ---------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `url`            | `string`         | Required                                     | Non-empty BigGenePred or BigGenePredPlusV1 BigBed URL. Changing it requests new data.               |
| `geneName`       | `string`         | None                                         | Case-insensitive gene name or identifier substring to highlight.                                    |
| `tagColors`      | `GeneTagColor[]` | `[{ tag: "MANE_Select", color: "#000000" }]` | Ordered exact source tags and colors. The first matching entry supplies the transcript color.       |
| `highlightColor` | `string`         | `"#000000"`                                  | Six-digit hexadecimal color for matching glyphs and labels. Gene highlighting overrides tag colors. |
| `rowHeight`      | `number`         | `12`                                         | Complete vertical row slot. Must be finite and at least 1 pixel.                                    |

## Settings

The form edits the source URL, gene highlighting, and ordered tag colors, along with title, display, color, height, and row height.

Host-owned tracks show annotation dataset and version selectors for the current assembly. Selecting either changes the URL while the URL field remains disabled. User-owned tracks show an editable URL field without those selectors.

Drag a tag row's handle with a pointer to change its priority. Tag fields accept typed values and suggest tags observed in regions fetched from the current URL during this page session. The suggestions cover only those fetched regions.

## Reference datasets

Import `getGeneDatasetsForAssembly` and `getGeneDatasetTitle` from `@weng-lab/genomebrowser-tracks/gene` to build collections from the same catalog used by Gene settings. For server code, `@weng-lab/genomebrowser-tracks/gene-datasets` exports these helpers and the `GeneDataset` type without importing renderers or settings components.

```ts
import { mm10 } from "@weng-lab/genomebrowser";
import {
  geneModule,
  getGeneDatasetsForAssembly,
  getGeneDatasetTitle,
} from "@weng-lab/genomebrowser-tracks/gene";

const tracks = getGeneDatasetsForAssembly(mm10.id).map((dataset) =>
  geneModule.create({
    base: {
      id: dataset.id,
      title: getGeneDatasetTitle(dataset),
    },
    source: "host",
    config: { url: dataset.url },
  }),
);
```

The mm10 catalog contains GENCODE M25 basic and comprehensive annotations for GRCm38. The hg38 catalog contains human releases 29, 40, 46–49 in both variants and release 50 basic. Newer mouse releases on GRCm39/mm39 are not included.

Unknown assembly IDs, including mm39, return an empty array; host settings display an unavailable-datasets message. IDs match exactly: use `mm10`, not `GRCm38`.

`getGeneDatasetsForAssembly(assembly: string)` returns `readonly GeneDataset[]`. `getGeneDatasetTitle(dataset)` returns a title such as `GENCODE M25 basic`.

| Readonly `GeneDataset` field | Type                           | Description                       |
| ---------------------------- | ------------------------------ | --------------------------------- |
| `id`                         | `string`                       | Dataset identifier.               |
| `assembly`                   | `string`                       | Assembly ID.                      |
| `variant`                    | `"basic"` or `"comprehensive"` | Annotation subset.                |
| `version`                    | `number`                       | Release number.                   |
| `release`                    | `string`                       | Display release, such as `"M25"`. |
| `url`                        | `string`                       | BigBed source.                    |

Each catalog entry can create an independent track for comparison.

Settings change the existing track's URL, preserving its display configuration. Titles matching `getGeneDatasetTitle` for the previous dataset follow the selection; other titles remain unchanged. Save the resulting track configuration and base fields together when persisting tracks.

The catalog lists sources for known assemblies. For a custom URL, the application must match the file to the browser assembly.

## Source requirements

The source must be an absolute public HTTP or HTTPS BigBed URL. Standard BigGenePred has these columns in order:

`chrom`, `chromStart`, `chromEnd`, `name`, `score`, `strand`, `thickStart`, `thickEnd`, `reserved`, `blockCount`, `blockSizes`, `chromStarts`, `name2`, `cdsStartStat`, `cdsEndStat`, `exonFrames`, `type`, `geneName`, `geneName2`, `geneType`.

BigGenePredPlusV1 appends `tags` as column 21 and `attributes` as column 22.

In the expanded format, `tags` is a comma-separated string. The track trims entries and removes empty and duplicate entries while preserving first-seen order. `attributes` is compact JSON whose top level is an object and whose values are strings or string arrays. The track parses these fields into `GeneTranscript.tags` and `GeneTranscript.attributes`. Standard records receive an empty tag list and attribute object.

The track exposes trimmed `name2` as `transcriptName`, falling back to the transcript identifier when `name2` is blank. The complete source record remains available as `source`.

The reader rejects malformed coordinates and block arrays, invalid JSON, and unsupported attribute value types. The server must support byte-range responses and cross-origin browser requests. See [Data source troubleshooting](../../04-troubleshooting.md).

## Grouping and interactions

Merged groups transcripts by chromosome, strand, and stable gene identifier. A grouped interval spans the minimum transcript start through the maximum transcript end, and its name comes from the normalized gene name.

Click, hover, and leave callbacks receive a `GeneInteractionTarget`. A whole transcript or gene uses a `"transcript"` or `"gene"` target. Every visible CDS, UTR, noncoding exon, and intron run has its own `"part"` target. Part hit regions span the complete row height, so thin introns remain easy to point at. Strand marks are decoration and resolve through their parent intron rather than becoming separate targets.

```ts
import { geneModule, type GeneInteraction } from "@weng-lab/genomebrowser-tracks/gene";

const interaction: GeneInteraction = {
  onClick(target) {
    if (target.kind === "part") {
      console.info(target.part.kind, target.part.start, target.part.end);
    }
  },
};

const track = geneModule.create(
  {
    base: {
      id: "genes",
      title: "Genes",
    },
    config: { url: "YOUR_URL_HERE" },
  },
  interaction,
);
```

For a `"part"` target, `target.part.source` is `"transcript"` or `"merged"`. Transcript parts retain exon, intron, frame, and transcription-order metadata.

Where transcripts overlap in a merged part, the displayed classification follows this priority: CDS, UTR, noncoding exon, then intron. For merged exon parts, `metadata.winningContributions` records the transcripts with that classification. `metadata.overriddenContributions` retains the lower-priority classifications from other transcripts at the same interval.

A merged intron part combines adjacent intron intervals into one visible run. Its `segments` retain the contribution metadata for each interval, since different transcripts may support different sections of the run.

All part tooltips show the type, interval, and length. Additional details depend on the target:

| Target            | Tooltip details                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Transcript part   | Transcript name and identifier, exon or intron number, and UTR side or coding frame when relevant.                                              |
| Merged exon part  | Names of transcripts supporting the displayed classification, lower-priority classifications at the same interval, and UTR sides when relevant. |
| Merged intron run | Names of supporting transcripts collected from all `segments` in the run.                                                                       |
| Whole transcript  | Location, strand, transcript name, and identifier.                                                                                              |
| Whole gene        | Location, strand, and transcript count.                                                                                                         |

## Data shapes

`GeneData` is `GeneTranscript[]`. Each `GeneTranscript` contains:

| Field                            | Type                                 | Description                                                |
| -------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `kind`                           | `"transcript"`                       | Identifies a transcript.                                   |
| `chromosome`                     | `string`                             | Chromosome name.                                           |
| `start`, `end`                   | `number`                             | Genomic coordinates.                                       |
| `strand`                         | `"+"` or `"-"`                       | Transcript strand.                                         |
| `transcriptId`, `transcriptName` | `string`                             | Transcript identifier and display name.                    |
| `geneId`, `geneName`             | `string`                             | Gene identifier and display name.                          |
| `tags`                           | `string[]`                           | Normalized source tags.                                    |
| `attributes`                     | `Record<string, string \| string[]>` | Parsed attributes.                                         |
| `exons`                          | Array of `{ start, end, frame }`     | Numeric coordinates and a frame of `-1`, `0`, `1`, or `2`. |
| `source`                         | Parsed source record                 | Original source fields described above.                    |

`GroupedGene` has `kind: "gene"`, the same chromosome, coordinate, strand, and gene fields, and `transcripts: GeneTranscript[]`. `GeneTagColor` is `{ tag: string; color: string }`.

`GeneInteractionTarget` identifies the clicked or hovered feature:

| `kind`         | `feature`        | `part`                                       |
| -------------- | ---------------- | -------------------------------------------- |
| `"gene"`       | `GroupedGene`    | Absent.                                      |
| `"transcript"` | `GeneTranscript` | Absent.                                      |
| `"part"`       | `GeneTranscript` | Transcript part with `source: "transcript"`. |
| `"part"`       | `GroupedGene`    | Merged part with `source: "merged"`.         |

After narrowing `kind` to `"part"`, inspect `target.part.source` to distinguish transcript and merged geometry. Source-format and geometry aliases are internal; access their fields through these public types.

## Exported types

| Export                  | Description                                                             |
| ----------------------- | ----------------------------------------------------------------------- |
| `GeneCreateInput`       | Input accepted by `geneModule.create`.                                  |
| `GeneConfig`            | Parsed source, color, highlighting, and row-layout configuration.       |
| `GeneDisplay`           | `"full" \| "merged" \| "tagged"`.                                       |
| `GeneTagColor`          | One exact transcript tag and its six-digit hexadecimal color.           |
| `GeneData`              | Array of normalized `GeneTranscript` records returned by the fetcher.   |
| `GeneTranscript`        | Transcript coordinates, names, tags, attributes, exons, and source row. |
| `GroupedGene`           | Gene interval and its original transcript objects.                      |
| `GeneInteractionTarget` | Typed gene, transcript, or part callback and tooltip payload.           |
| `GeneInteraction`       | Callbacks receiving a `GeneInteractionTarget` and `GeneConfig`.         |

Return to [Area index](README.md) or [Tracks API reference](../README.md).
