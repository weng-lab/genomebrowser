# Gene

Use `geneModule` for transcript annotations stored in a standard BigGenePred or expanded BigGenePredPlusV1 BigBed file. The track can draw every transcript, transcripts matching configured tags, or one merged structure per gene.

## Minimal track

```ts
import { geneModule } from "@weng-lab/genomebrowser-tracks/gene";

const track = geneModule.create({
  id: "genes",
  title: "Genes",
  config: { url: "YOUR_URL_HERE" },
});
```

## Displays and base defaults

| Field     | Supported or default                       | Behavior                                                                                                                         |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `display` | `"full"` (default), `"merged"`, `"tagged"` | Full draws all transcripts. Merged draws one grouped union per gene. Tagged draws transcripts matching any configured tag color. |
| `height`  | `12`                                       | The renderer replaces this with packed row count times `rowHeight`.                                                              |
| `color`   | `"#4b9560"`                                | Fill and stroke color for transcripts that do not match a configured tag.                                                        |

Full and tagged draw each intron as a line with chevrons pointing in the transcript's strand direction. Exons are rectangles. For a coding transcript, intersection with the half-open `thickStart` to `thickEnd` interval produces tall CDS segments. Exon sequence outside that interval produces shorter UTR segments classified as 5-prime or 3-prime from the transcript strand. When `thickStart` equals `thickEnd`, every exon is a shorter noncoding-exon segment.

Tag colors use exact, case-sensitive equality. A transcript uses the color from the first `tagColors` entry matching one of its source tags. Full applies these colors while retaining unmatched transcripts. Tagged omits unmatched transcripts, and an empty list draws no transcripts. Gene-name highlighting overrides tag colors. Standard BigGenePred does not include tags, so its tagged display is empty. Merged preserves the grouped union of all source transcripts and does not apply tag colors. Exon coverage replaces overlapping intron coverage, and conflicting exon categories resolve in this order: CDS, UTR, then noncoding exon.

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

The Gene settings panel provides the required URL, gene highlighting controls, and an ordered list of tag colors. Drag a row's handle with a pointer to change its priority. Tag inputs accept free-entry values and suggest tags observed in regions fetched from the current URL during this page session. These suggestions are not a complete catalog of the BigBed file. The shared base settings provide display, color, height, and row-height controls.

## Source requirements

The source must be an absolute public HTTP or HTTPS BigBed URL. Standard BigGenePred has these columns in order:

`chrom`, `chromStart`, `chromEnd`, `name`, `score`, `strand`, `thickStart`, `thickEnd`, `reserved`, `blockCount`, `blockSizes`, `chromStarts`, `name2`, `cdsStartStat`, `cdsEndStat`, `exonFrames`, `type`, `geneName`, `geneName2`, `geneType`.

BigGenePredPlusV1 appends `tags` and `attributes`:

`chrom`, `chromStart`, `chromEnd`, `name`, `score`, `strand`, `thickStart`, `thickEnd`, `reserved`, `blockCount`, `blockSizes`, `chromStarts`, `name2`, `cdsStartStat`, `cdsEndStat`, `exonFrames`, `type`, `geneName`, `geneName2`, `geneType`, `tags`, `attributes`.

In the expanded format, `tags` is a comma-separated string. The track trims entries and removes empty and duplicate entries while preserving first-seen order. `attributes` is compact JSON whose top level is an object and whose values are strings or string arrays. The track parses these fields into `GeneTranscript.tags` and `GeneTranscript.attributes`. Standard records receive an empty tag list and attribute object. The track exposes trimmed `name2` as `transcriptName`, falling back to the transcript identifier when `name2` is blank. The complete source record remains available as `source`.

The reader rejects malformed coordinates and block arrays, invalid JSON, and unsupported attribute value types. The server must support byte-range responses and cross-origin browser requests. See [Data source troubleshooting](../dataSources.md).

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
    id: "genes",
    title: "Genes",
    config: { url: "YOUR_URL_HERE" },
  },
  interaction,
);
```

`GenePart.source` distinguishes transcript geometry from merged geometry. Transcript parts retain exon, intron, frame, and transcription-order metadata. Merged exon parts retain winning and overridden transcript contributions. A merged intron part represents one drawable run and exposes its detailed contribution intervals through `segments`.

Part tooltips show the type, interval, and length. Transcript parts also show their transcript, exon or intron number, UTR side, or coding frame when relevant. Merged exons show the supporting transcripts and any lower-priority classifications at the same interval. Merged intron runs list contributors across the run because support can vary between their stored segments. Whole transcript and gene targets show the feature interval, strand, and transcript identifier or transcript count.

## Exported types

| Export                    | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `GeneCreateInput`         | Input accepted by `geneModule.create`.                                  |
| `GeneConfig`              | Parsed source, color, highlighting, and row-layout configuration.       |
| `GeneDisplay`             | `"full" \| "merged" \| "tagged"`.                                       |
| `GeneTagColor`            | One exact transcript tag and its six-digit hexadecimal color.           |
| `GeneData`                | Array of normalized `GeneTranscript` records returned by the fetcher.   |
| `GeneFeature`             | `GeneTranscript \| GroupedGene`, the rendered biological feature type.  |
| `GeneTranscript`          | Transcript coordinates, names, tags, attributes, exons, and source row. |
| `GroupedGene`             | Gene interval and its original transcript objects.                      |
| `GeneExon`                | Validated exon coordinates and frame.                                   |
| `GeneAttributes`          | Parsed attribute object with string or string-array values.             |
| `GeneAttributeValue`      | `string \| string[]`.                                                   |
| `BigGenePredSource`       | Parsed standard BigGenePred source fields.                              |
| `BigGenePredPlusV1Source` | Parsed BigGenePredPlusV1 source fields.                                 |
| `BigGenePredCdsStatus`    | Standard coding status values.                                          |
| `GeneStrand`              | `"+" \| "-"`.                                                           |
| `GenePart`                | Transcript or merged exon/intron payload used by a part target.         |
| `GeneTranscriptPart`      | Transcript part with `source: "transcript"`.                            |
| `MergedGenePart`          | Merged part with `source: "merged"`; intron runs retain `segments`.     |
| `GeneInteractionTarget`   | Typed gene, transcript, or part callback and tooltip payload.           |
| `GeneInteraction`         | Callbacks receiving a `GeneInteractionTarget` and `GeneConfig`.         |
