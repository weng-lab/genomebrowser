# Transcript Track

`transcriptModule` renders gene and transcript models from the SCREEN GraphQL API.

## Config

```ts
const track = transcriptModule.create({
  id: "genes",
  title: "Genes",
  config: {
    assembly: "GRCh38",
    version: 47,
  },
});
```

Fields:

- `assembly`: SCREEN assembly name, required
- `version`: positive integer SCREEN annotation version, required
- `geneName`: optional gene name to highlight
- `canonicalColor`: optional color for canonical transcripts
- `highlightColor`: optional color for highlighted genes/transcripts

Display modes:

- `squish`
- `pack`

Defaults:

- `height`: `90`
- `color`: `#7a4fb3`
- `display`: `squish`

## Fetch Behavior

The module posts a region query to `https://screen.api.wenglab.org/graphql`. `SCREEN_API_KEY` is read from `import.meta.env` when the package is built, so the package build environment must provide it. A browser runtime environment variable set after the library has been built does not inject the key. Fetching throws if the built value is missing.

Changing `assembly` or `version` triggers a refetch. Changing `geneName`, colors, height, or display mode does not refetch data.
