# Data source troubleshooting

Use this page when a track accepts its configuration but cannot load data. It covers the common browser and server requirements for the built-in tracks.

## BigBed and BigWig sources

BigBed and BigWig readers request selected byte ranges instead of downloading a whole file. This applies to BigBed, cCRE BigBed, BulkBed, Gene, BigWig, and non-empty MethylC channel URLs.

Check the failed request in your browser's network panel:

1. The URL must be reachable from the browser over HTTP or HTTPS.
2. A byte-range request must return `206 Partial Content`, not the complete file with `200 OK`.
3. A source on another origin must allow the browser request through cross-origin resource sharing, usually called CORS. The response must include an `Access-Control-Allow-Origin` header that permits your application origin.

Opening the file URL in a browser tab does not prove that CORS is configured. A top-level navigation and a request made by your application follow different browser rules. If the console reports a CORS error, change the source server's response headers or serve the file through a server you control.

If the server ignores the `Range` request header or cannot return `206 Partial Content`, move the file to a host that supports byte-range requests.

## Transcript endpoint

Transcript defaults to `/api/screen-graphql`. Your application must implement that same-origin route or configure another endpoint that permits browser requests. The module sends a JSON GraphQL POST request but does not add authorization headers or read a service key.

If the upstream GraphQL service requires credentials, proxy the request through your server. Add credentials on the server, then configure the track's `endpoint` with your proxy route. Do not put secrets in track configuration because endpoint values may appear in collections or saved state.

See [Transcript](tracks/transcript.md#source-requirements) for the request and response requirements.
