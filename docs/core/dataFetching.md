# SCREEN GraphQL Data Fetching

This page records the maintainer contract for features that fetch from the SCREEN GraphQL API. Read it before adding a SCREEN-backed track, browser feature, or UI component.

## Endpoint and authentication

The host application owns GraphQL endpoint routing and authentication. Genomebrowser packages never read build-time API keys, accept credentials through component or track configuration, or add authorization headers. SCREEN-backed features default to the same-origin route `/api/screen-graphql`; hosts may override that non-secret endpoint when their route differs.

First-party products use this flow:

```text
Apollo application queries --\
Genomebrowser requests -------> /api/screen-graphql -> authenticated SCREEN API
Other browser components ----/
```

The product's server route adds `SCREEN_API_KEY` when forwarding to `https://screen.api.wenglab.org/graphql`. The key remains server-only. Apollo may use the same route for product queries, but genomebrowser uses native `fetch` and does not require an Apollo provider.

Pass infrastructure at the narrow public boundary:

```tsx
import { transcriptModule } from "@weng-lab/genomebrowser-tracks/transcript";
import { Cytobands } from "@weng-lab/genomebrowser-ui";

const transcriptTrack = transcriptModule.create({
  id: "genes",
  title: "Genes",
  config: {
    assembly: "GRCh38",
    version: 47,
  },
});

<Cytobands assembly="GRCh38" chromosome="chr6" width={720} height={28} />;
```

When a host does not use the conventional route, set `config.endpoint` on Transcript tracks and `endpoint` on Cytobands. Endpoint overrides are ordinary, non-secret data-source configuration and may appear in collections or saved browser state; credentials must not.

## CORS errors usually indicate authentication failure

When an unauthenticated browser request reaches the SCREEN endpoint, the server may return `403` without an `Access-Control-Allow-Origin` header. Browser JavaScript cannot inspect that response and reports a generic error such as:

```text
NetworkError when attempting to fetch resource
```

The browser console may separately report a blocked cross-origin request. This does not by itself indicate that the GraphQL query is malformed. Check authentication and endpoint selection before changing the query.

Use this order when diagnosing a request:

1. Confirm the request targets the intended endpoint or application proxy.
2. Confirm the browser request targets a same-origin product route rather than the authenticated upstream service.
3. Confirm the server route has access to its server-only credential and adds the expected upstream header.
4. Confirm the browser request itself contains no service credential.
5. Inspect the GraphQL operation and variables only after transport and authentication succeed.
6. Handle non-2xx responses, GraphQL `errors`, malformed envelopes, and empty data separately.

## Assembly names are resolver-specific

Sharing one GraphQL endpoint does not guarantee that every resolver accepts the same assembly vocabulary. Public browser state and track configuration use canonical names such as `GRCh38`, while the cytoband resolver expects `hg38`.

Normalize aliases at the request boundary rather than changing browser state:

- `GRCh38`, `GRCH38`, and `hg38` become `hg38` for a cytoband request.
- Unknown assembly values pass through unchanged unless the resolver has a documented mapping.
- Cache identity should retain the caller's original assembly input so request behavior remains predictable.

Do not use a broad fallback such as “anything other than GRCh38 is mm10.” Explicit mappings prevent a typo or newly supported assembly from silently requesting the wrong organism.

## Request ownership

The feature that owns a request also owns its query, response validation, error translation, cancellation, and cache identity. Keep display-only values out of request identity. For regional track modules, continue to follow the raw-data fetch boundary in [Tracks and track modules](tracks.md); renderers remain responsible for pixel geometry.

For SCREEN-backed UI components outside the track runtime:

- keep the GraphQL operation next to the request adapter;
- use native fetch unless the package explicitly owns an Apollo boundary;
- abort obsolete work where practical and prevent stale responses from replacing current data;
- validate coordinates and response shape before rendering;
- provide bounded loading, empty, and error states;
- test exact endpoint use, absence of browser authorization headers, HTTP failures, GraphQL errors, and successful parsing.

Package documentation must explain any required endpoint or proxy configuration without linking back to this maintainer-only page.
