# Release notes

## Unreleased

Removed `transcriptModule`, the `@weng-lab/genomebrowser-tracks/transcript` entry point and its exported types, and the `"transcript"` track type from the first-party registry and collection schema.

Migrate old GraphQL tracks and saved collections to [Gene](tracks/gene.md) using a BigGenePred or BigGenePredPlusV1 BigBed URL in `config.url`. Choose `full`, `merged`, or `tagged` display and review the Gene configuration; changing only the track type is insufficient. The old `endpoint`, `assembly`, `version`, and `canonicalColor` settings do not configure Gene. Gene retains transcript rendering and interactions.

GenomeSearch still uses the application-owned `/api/screen-graphql` proxy independently of tracks. Keep that route and its server-side authentication when search needs it.
