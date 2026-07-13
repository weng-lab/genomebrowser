# Built-in Track Modules

v2 ships first-party track modules for common genomic data types. Each module follows the shared track module contract described in [Tracks and track modules](../tracks.md).

- [BigWig](bigwig.md): signal data from one BigWig URL
- [BigBed](bigbed.md): genomic intervals from one BigBed URL
- [BulkBed](bulkbed.md): multiple BigBed datasets in one track
- [Transcript](transcript.md): gene and transcript models from the SCREEN GraphQL API
- [MethylC](methylc.md): split-strand methylation signal from BigWig channels
- CAVE: paired methylation signal selected by neurotransmitter and age

All built-in modules support the shared base fields `id`, `title`, `display`, `height`, and `color` at the top level of create input. Module-specific fields live under `config`, and optional interaction callbacks are passed as the second `create` argument.
