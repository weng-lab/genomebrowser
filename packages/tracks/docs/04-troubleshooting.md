# Data source troubleshooting

Use this page when a track accepts its configuration but cannot load data.

## Failed file requests

BAM, BigBed, BigWig, and reference 2bit readers request byte ranges. Inspect the failed request in the browser's network panel:

1. Confirm that the HTTP or HTTPS URL is reachable from the application.
2. Check that the server returns `206 Partial Content` for a `Range` request and sends the requested byte count. A full-file `200 OK` response is insufficient.
3. Serve byte ranges without HTTP content encoding. Compression changes the bytes used by the file's internal offsets.
4. For another origin, configure CORS to permit requests from the application. Check the browser console for blocked requests.

Opening a URL in a separate tab does not verify CORS. Configure the source server or serve the file through a server you control. If the host does not support byte-range requests, use one that does.

## Empty tracks

Check the assembly, chromosome name, and data coverage in the selected region. Configuration validation does not verify that a file loads or contains records for the current region. If the ruler and data tracks are both absent, check that the browser's containing layout has a positive width.

## BAM indexes and zoom limits

[BAM](03-reference/01-trackModules/bam.md) needs a matching BAI URL and exact sequence names. A zoom-in message means the visible span has reached `maxWindow`; zoom in or increase that setting. A reference warning affects optional mismatch comparisons, while BAM and index failures use the track error display.

## Reference sequence

The [ruler](03-reference/01-trackModules/ruler.md) reads HTTP(S) version-0 2bit files. Sequence names must match the assembly. A missing chromosome returns no sequence; a request failure leaves the coordinate axis visible and places the error in its SVG title.

Return to [Tracks documentation](README.md).
