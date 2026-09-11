# Track catalog

Choose a track by the source you already have. Each module includes a renderer, settings panel, and configuration schema. Data tracks also provide tooltips.

Track backgrounds are transparent. The browser supplies the white background, allowing genomic highlights to remain visible behind the rendered data without changing its colors.

## BigBed files

- [BigBed](bigbed.md) reads one general BigBed file. Use it for genomic intervals and BED-like metadata.
- [cCRE BigBed](ccre.md) reads an ENCODE aggregate cCRE BigBed file. Use it when the columns match the cCRE schema and you want cCRE classification in the tooltip.
- [BulkBed](bulkbed.md) reads several BigBed files. Use it to place one named dataset in each row of a single track.
- [Gene](gene.md) reads standard BigGenePred and BigGenePredPlusV1 records. Use it to show every transcript, transcripts matching selected tags, or a merged gene structure.

These files must be available to the browser and support byte-range requests.

## BigWig files

- [BigWig](bigwig.md) reads one BigWig file. Use it for a quantitative signal with full or dense display.
- [MethylC](methylc.md) reads up to eight BigWig files for plus- and minus-strand CpG, CHG, CHH, and depth channels.
- [CAVE](cave.md) reads a package-selected pair of hg38 BigWig files for hmC and OXBS. Use it only for the built-in neurotransmitter and age combinations. It does not accept source URLs.

## GraphQL

- [Transcript](transcript.md) reads gene and transcript models from a GraphQL endpoint. Use it when an endpoint provides the expected query and permits requests from your application.

For URL-backed files and Transcript endpoints, see [Data source troubleshooting](../dataSources.md) when a source does not load. CAVE uses package-owned URLs and cannot be pointed at another host.

## Coordinates and reference DNA

- [Ruler](ruler.md) draws genomic coordinates and optional 2bit reference bases at close zoom.
