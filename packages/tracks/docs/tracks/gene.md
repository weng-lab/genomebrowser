# Gene

Use `geneModule` for transcript annotations stored in a standard BigGenePred or expanded BigGenePredPlusV1 BigBed file. The track can draw every transcript, only MANE Select transcripts when tags are available, or one merged structure per gene.

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

| Field     | Supported or default                          | Behavior                                                                                                                            |
| --------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `display` | `"full"` (default), `"merged"`, `"canonical"` | Full draws all transcripts. Merged draws one grouped union per gene. Canonical draws only transcripts tagged exactly `MANE_Select`. |
| `height`  | `12`                                          | The renderer replaces this with packed row count times `rowHeight`.                                                                 |
| `color`   | `"#4b9560"`                                   | Fill color for exon segments and stroke color for introns.                                                                          |

Full and canonical draw each intron as a line with chevrons pointing in the transcript's strand direction. Exons are rectangles. For a coding transcript, intersection with the half-open `thickStart` to `thickEnd` interval produces tall CDS segments. Exon sequence outside that interval produces shorter UTR segments classified as 5-prime or 3-prime from the transcript strand. When `thickStart` equals `thickEnd`, every exon is a shorter noncoding-exon segment.

Canonical filters the source transcripts by exact tag equality. It does not choose another transcript when a gene has no `MANE_Select` transcript, so that gene does not appear. Standard BigGenePred does not include tags, so its canonical display is empty and `canonicalColor` has no effect. Merged preserves the grouped union of all source transcripts. Exon coverage replaces overlapping intron coverage, and conflicting exon categories resolve in this order: CDS, UTR, then noncoding exon.

Full and canonical label each transcript with its normalized `transcriptName`. Merged uses the gene name. A label appears to the right when space permits, otherwise to the left. The renderer hides it when neither side fits inside the viewport. Label bounds participate in row packing.

## Config

| Option           | Type     | Default     | Description                                                                           |
| ---------------- | -------- | ----------- | ------------------------------------------------------------------------------------- |
| `url`            | `string` | Required    | Non-empty BigGenePred or BigGenePredPlusV1 BigBed URL. Changing it requests new data. |
| `geneName`       | `string` | None        | Case-insensitive gene name or identifier substring to highlight.                      |
| `canonicalColor` | `string` | `"#000000"` | Color for MANE Select transcript glyphs and labels.                                   |
| `highlightColor` | `string` | `"#000000"` | Color for matching glyphs and labels. Highlighting overrides canonical color.         |
| `rowHeight`      | `number` | `12`        | Complete vertical row slot. Must be finite and at least 1 pixel.                      |

The Gene settings panel provides the required URL, gene query, and both colors. "Canonical transcript color" and "Highlight color" share one responsive row. The shared base settings provide display, color, height, and row-height controls.

## Source requirements

The source must be an absolute public HTTP or HTTPS BigBed URL. Standard BigGenePred has these columns in order:

`chrom`, `chromStart`, `chromEnd`, `name`, `score`, `strand`, `thickStart`, `thickEnd`, `reserved`, `blockCount`, `blockSizes`, `chromStarts`, `name2`, `cdsStartStat`, `cdsEndStat`, `exonFrames`, `type`, `geneName`, `geneName2`, `geneType`.

BigGenePredPlusV1 appends `tags` and `attributes`:

`chrom`, `chromStart`, `chromEnd`, `name`, `score`, `strand`, `thickStart`, `thickEnd`, `reserved`, `blockCount`, `blockSizes`, `chromStarts`, `name2`, `cdsStartStat`, `cdsEndStat`, `exonFrames`, `type`, `geneName`, `geneName2`, `geneType`, `tags`, `attributes`.

In the expanded format, `tags` is a comma-separated string. The track trims entries and removes empty and duplicate entries while preserving first-seen order. `attributes` is compact JSON whose top level is an object and whose values are strings or string arrays. The track parses these fields into `GeneTranscript.tags` and `GeneTranscript.attributes`. Standard records receive an empty tag list and attribute object. The track exposes trimmed `name2` as `transcriptName`, falling back to the transcript identifier when `name2` is blank. The complete source record remains available as `source`.

The reader rejects malformed coordinates and block arrays, invalid JSON, and unsupported attribute value types. The server must support byte-range responses and cross-origin browser requests. See [Data source troubleshooting](../dataSources.md).

## Grouping and interactions

Merged groups transcripts by chromosome, strand, and stable gene identifier. A grouped interval spans the minimum transcript start through the maximum transcript end, and its name comes from the normalized gene name.

Click, hover, and leave callbacks receive a `GeneTranscript` in full and canonical displays and a `GroupedGene` in merged display. Each item uses one full-row hit target across its visible span. The target remains red and partially opaque to expose its bounds during development. Direction marks and biological parts do not receive pointer events. The tooltip shows the genomic location, strand, and transcript identifier or transcript count.

## Exported types

| Export                    | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `GeneCreateInput`         | Input accepted by `geneModule.create`.                                  |
| `GeneConfig`              | Parsed source, color, highlighting, and row-layout configuration.       |
| `GeneDisplay`             | `"full" \| "merged" \| "canonical"`.                                    |
| `GeneData`                | Array of normalized `GeneTranscript` records returned by the fetcher.   |
| `GeneFeature`             | `GeneTranscript \| GroupedGene`, the interaction and tooltip item type. |
| `GeneTranscript`          | Transcript coordinates, names, tags, attributes, exons, and source row. |
| `GroupedGene`             | Gene interval and its original transcript objects.                      |
| `GeneExon`                | Validated exon coordinates and frame.                                   |
| `GeneAttributes`          | Parsed attribute object with string or string-array values.             |
| `GeneAttributeValue`      | `string \| string[]`.                                                   |
| `BigGenePredSource`       | Parsed standard BigGenePred source fields.                              |
| `BigGenePredPlusV1Source` | Parsed BigGenePredPlusV1 source fields.                                 |
| `BigGenePredCdsStatus`    | Standard coding status values.                                          |
| `GeneStrand`              | `"+" \| "-"`.                                                           |
| `GeneInteraction`         | Callbacks receiving a `GeneFeature` and `GeneConfig`.                   |
