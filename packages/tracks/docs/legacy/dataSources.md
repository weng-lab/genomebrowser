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

## Reference sequence

The [ruler](../reference/trackModules/ruler.md) accepts HTTP(S) version-0 2bit files with byte-range support and browser CORS. Expose `Content-Range` to the browser. Sequence names must match the assembly exactly. A missing chromosome returns no sequence; request failures leave the coordinate axis visible. BigWig numeric values are not reference bases.

Return to [Legacy guides](README.md) or [API reference](../reference/README.md).
