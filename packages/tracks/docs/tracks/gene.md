# Gene

Use `geneModule` for transcript annotations in a standard BigGenePred BigBed file. Pack shows each transcript's exon structure. Squish combines transcripts from the same gene into one interval.

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

| Field     | Supported or default           | Behavior                                                                      |
| --------- | ------------------------------ | ----------------------------------------------------------------------------- |
| `display` | `"pack"` (default), `"squish"` | Pack draws transcript parts. Squish draws one rectangle per grouped gene.     |
| `height`  | `12`                           | The renderer replaces this with packed row count times `rowHeight`.           |
| `color`   | `"#4b9560"`                    | Fill color for exon segments and grouped genes, and stroke color for introns. |

Pack draws each intron as a line with chevrons pointing in the transcript's strand direction, and each exon as one or more rectangles. For a coding transcript, intersection with the half-open `thickStart`–`thickEnd` interval produces tall CDS segments; exon sequence outside that interval produces shorter UTR segments classified as 5-prime or 3-prime from the transcript strand. When `thickStart` equals `thickEnd`, every exon is a shorter noncoding-exon segment. Squish remains a simple grouped-gene rectangle. Neither display renders labels. Both displays pack non-overlapping transcript or gene spans into shared row slots.

## Config

| Option      | Type     | Default  | Description                                                      |
| ----------- | -------- | -------- | ---------------------------------------------------------------- |
| `url`       | `string` | Required | Non-empty BigGenePred BigBed URL. Changing it requests new data. |
| `rowHeight` | `number` | `12`     | Complete vertical row slot. Must be finite and at least 1 pixel. |

The Gene-specific settings panel provides the required URL field. The shared base settings provide display, color, height, and row-height controls.

## Source requirements

The source must be an absolute public HTTP(S) BigBed URL with the standard BigGenePred BED12+8 columns in this order:

`chrom`, `chromStart`, `chromEnd`, `name`, `score`, `strand`, `thickStart`, `thickEnd`, `reserved`, `blockCount`, `blockSizes`, `chromStarts`, `name2`, `cdsStartStat`, `cdsEndStat`, `exonFrames`, `type`, `geneName`, `geneName2`, `geneType`.

The server must support byte-range responses and cross-origin browser requests. See [Data source troubleshooting](../dataSources.md).

The reader parses numeric fields and comma-separated block arrays. It preserves the `reserved` item-RGB field as source text and accepts either an unsigned integer or an `R,G,B` value. A record is rejected when its transcript or coding coordinates are invalid, block-array lengths differ from `blockCount`, blocks overlap or extend outside the transcript, or the first and last blocks do not match the transcript bounds. The track caches one genomic-reader file instance per URL in track-scoped resources.

## Grouping and interactions

Squish groups records by chromosome, strand, and `geneName`. Some BigGenePred producers repeat the transcript `name` in `geneName`; when that happens or `geneName` is empty, the track falls back to `geneName2`, `name2`, and then the transcript `name`. A grouped interval spans the minimum transcript start through the maximum transcript end. The display name prefers `geneName2`.

Click, hover, and leave callbacks receive a `GeneTranscript` in pack mode and a `GroupedGene` in squish mode. Pack uses one transparent, full-row hit target across the visible transcript span, so an interaction applies to the whole transcript rather than an individual intron, direction mark, or exon segment. Direction marks and biological parts do not receive pointer events. These objects keep genomic coordinates; pixel coordinates are used only to place SVG elements. Each transcript also retains its complete parsed BED12+8 record in `source`, including block arrays and any extra trailing fields. The tooltip shows the genomic location, strand, and transcript identifier or transcript count.

## Exported types

| Export                 | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `GeneCreateInput`      | Input accepted by `geneModule.create`.                                      |
| `GeneConfig`           | Parsed config with `url` and `rowHeight`.                                   |
| `GeneDisplay`          | `"pack" \| "squish"`.                                                       |
| `GeneData`             | Array of parsed `GeneTranscript` records returned by the fetcher.           |
| `GeneFeature`          | `GeneTranscript \| GroupedGene`, the interaction and tooltip item type.     |
| `GeneTranscript`       | Transcript coordinates, exons, identifiers, and the complete source record. |
| `GroupedGene`          | Gene interval and its original transcript objects.                          |
| `GeneExon`             | Validated exon coordinates and frame.                                       |
| `BigGenePredSource`    | Parsed standard BED12+8 source fields and remaining trailing fields.        |
| `BigGenePredCdsStatus` | Standard coding status values.                                              |
| `GeneStrand`           | `"+" \| "-"`.                                                               |
| `GeneInteraction`      | Callbacks receiving a `GeneFeature` and `GeneConfig`.                       |
