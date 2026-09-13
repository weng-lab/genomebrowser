# Track modules

Choose a track by the source you already have. Each module includes a renderer, settings panel, and configuration schema. Data tracks also provide tooltips.

Track backgrounds are transparent. The browser supplies the white background, allowing filled genomic highlights to remain visible behind the rendered data without changing its colors.

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

For URL-backed files, see [Data source troubleshooting](../../legacy/dataSources.md) when a source does not load. CAVE uses package-owned URLs and cannot be pointed at another host.

## Coordinates and reference DNA

- [Ruler](ruler.md) draws genomic coordinates and optional 2bit reference bases at close zoom.

## Using modules

Import one module from its track subpath and register it in core's `createTrackStore({ modules, tracks })`. Module registration makes a type available; `module.create(...)` creates an instance to include in `tracks`. Import the [complete module tuple](../collectionsAndSchemas/firstPartyTrackModules.md) when you support every first-party track.

Each module page owns its creation, configuration, source, display, and interaction contracts. Shared primitives are documented in the [reference index](../README.md).

Return to [Tracks API reference](../README.md).
