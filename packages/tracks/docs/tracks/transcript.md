# Transcript

`transcriptModule` renders gene and transcript models from a GraphQL endpoint that the browser can reach.

## Minimal track

```ts
import { transcriptModule } from "@weng-lab/genomebrowser-tracks/transcript";

const track = transcriptModule.create({
  id: "genes",
  title: "Genes",
  config: {
    assembly: "GRCh38",
    version: 47,
  },
});
```

## Displays and base defaults

| Field     | Supported or default           | Behavior                                                                                                                                 |
| --------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `display` | `"squish"` (default), `"pack"` | Squish merges each returned gene's transcripts; pack draws individual transcripts. Both pack overlaps into rows and adjust track height. |
| `height`  | `90`                           | Initial height in pixels.                                                                                                                |
| `color`   | `"#7a4fb3"`                    | Default transcript color when no canonical or text highlight applies.                                                                    |

## Config

| Option           | Type     | Default                 | Description                                                                           |
| ---------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `endpoint`       | `string` | `"/api/screen-graphql"` | Non-empty GraphQL POST endpoint. The value is trimmed. Changing it requests new data. |
| `assembly`       | `string` | Required                | Non-empty assembly value sent to the query. Changing it requests new data.            |
| `version`        | `number` | Required                | Positive integer annotation version sent to the query. Changing it requests new data. |
| `geneName`       | `string` | Omitted                 | Case-insensitive substring used to highlight transcript names.                        |
| `canonicalColor` | `string` | `"#000000"`             | Six-digit hexadecimal color for MANE Select transcripts.                              |
| `highlightColor` | `string` | `"#000000"`             | Six-digit hexadecimal color for transcripts matching `geneName`.                      |

Canonical coloring takes precedence over `geneName` highlighting. Highlight and color changes redraw the track without requesting data.

Use `transcriptModule.configSchema` to validate config and `transcriptModule.createInputSchema` to validate the full create input.

## Source requirements

The module sends a JSON GraphQL POST request with chromosome, region start, region end, assembly, and version variables. The endpoint must return the queried gene-group shape, including transcript IDs, names, coordinates, exons, UTRs, and optional tags.

Your application must implement the default same-origin `/api/screen-graphql` route. The module does not add authorization headers or read a service key. To call an authenticated upstream service, send requests through your own server endpoint and add credentials there. Endpoint configuration is not secret and may appear in track collections or saved state.

## Settings and tooltip

The settings panel includes endpoint, assembly, positive-integer version, optional gene highlight text, canonical color, and highlight color.

The tooltip uses the transcript name as its title, or the ID when the name is empty. It also shows a distinct ID, genomic interval, strand, and optional tag. The renderer passes the corresponding `Transcript` to `onClick`, `onHover`, and `onLeave`.

## Exported types

| Export                  | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `TranscriptCreateInput` | Input accepted by `transcriptModule.create`.                                         |
| `TranscriptConfig`      | Parsed endpoint, query values, highlight value, and colors.                          |
| `TranscriptDisplay`     | `"squish" \| "pack"`.                                                                |
| `TranscriptData`        | Array of returned `TranscriptList` gene groups.                                      |
| `TranscriptList`        | Group of transcripts with strand and optional gene identity.                         |
| `Transcript`            | Transcript identity, coordinates, strand, exons, and optional presentation metadata. |
| `Exon`                  | Exon coordinates with optional UTR elements.                                         |
| `GenomicElement`        | Coordinate-bearing transcript sub-element.                                           |
| `RenderedTranscript`    | Transcript plus generated intron and exon paths.                                     |
| `TranscriptRow`         | Packed rendered transcripts at one vertical position.                                |
| `TranscriptInteraction` | Interaction callbacks receiving `Transcript` and `TranscriptConfig`.                 |
