# Built-in Track Modules

v2 ships first-party track modules for common genomic data types. Each module follows the shared track module contract described in [Tracks and track modules](../tracks.md).

- [BigWig](bigwig.md): signal data from one BigWig URL
- [BigBed](bigbed.md): genomic intervals from one BigBed URL
- [BulkBed](bulkbed.md): multiple BigBed datasets in one track
- [Transcript](transcript.md): gene and transcript models from the SCREEN GraphQL API
- [MethylC](methylc.md): split-strand methylation signal from BigWig channels

All built-in modules support the shared base config fields: `id`, `title`, `display`, `height`, `color`, and optional interaction callback fields.
