# First-party track modules

`packages/tracks` ships first-party track modules for common genomic data types. Each module follows the core contract described in [Tracks and track modules](../tracks.md). User-facing configuration and export documentation lives in `packages/tracks/docs`.

See [First-party track source layout](sourceLayout.md) for package entries, source directories, and shared exports.

- [BigWig](bigwig.md): signal data from one BigWig URL
- [BigBed](bigbed.md): genomic intervals from one BigBed URL
- [BulkBed](bulkbed.md): multiple BigBed datasets in one track
- [cCRE BigBed](../../../packages/tracks/docs/tracks/ccre.md): ENCODE cCRE intervals from BigBed
- [Transcript](transcript.md): gene and transcript models from the SCREEN GraphQL API
- [MethylC](methylc.md): split-strand methylation signal from BigWig channels
- [CAVE](../../../packages/tracks/docs/tracks/cave.md): paired methylation signal selected by neurotransmitter and age

All first-party modules support the shared base fields `id`, `title`, `display`, `height`, and `color` at the top level of create input. Module-specific fields live under `config`, and optional interaction callbacks are passed as the second `create` argument.
