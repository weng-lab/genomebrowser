# Transcript Track

`transcriptModule`, exported by `@weng-lab/genomebrowser-tracks/transcript`, renders gene and transcript models from a host-provided GraphQL endpoint.

## Config

```ts
const track = transcriptModule.create({
  id: "genes",
  title: "Genes",
  config: {
    endpoint: "/api/screen-graphql",
    assembly: "GRCh38",
    version: 47,
  },
});
```

Fields:

- `endpoint`: optional host-owned GraphQL POST endpoint; defaults to `/api/screen-graphql`
- `assembly`: SCREEN assembly name, required
- `version`: positive integer SCREEN annotation version, required
- `geneName`: optional gene name to highlight
- `canonicalColor`: six-digit `#RRGGBB` color for canonical transcripts; defaults to `#000000`
- `highlightColor`: six-digit `#RRGGBB` color for highlighted genes/transcripts; defaults to `#000000`

Display modes:

- `squish`
- `pack`

Defaults:

- `height`: `90`
- `color`: `#7a4fb3`
- `display`: `squish`

## Fetch Behavior

The module posts region queries to `config.endpoint` with JSON content type and no package-created authorization header. The default `/api/screen-graphql` route must be implemented by the host application; its server proxy owns any upstream credential. An endpoint override is non-secret data-source configuration and may be stored in collections or browser state.

Changing `endpoint`, `assembly`, or `version` triggers a refetch. Changing `geneName`, colors, height, or display mode does not refetch data.
