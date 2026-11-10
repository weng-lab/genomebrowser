import { afterEach, expect, it, vi } from "vitest";
import {
  HttpStatusError,
  bed3Schema,
  createBamFile,
  createBigBedFile,
  createBigWigFile,
  createTwoBitFile,
  readChromSizes,
  readCytobands,
} from "../src/lib";

const url = "https://example.test/file";
afterEach(() => vi.unstubAllGlobals());

// The first request each reader sends for a URL, which is where a missing or private file, or a
// host that ignores range requests, shows up.
const firstReads = [
  { reader: "BigWig", ranges: true, read: () => createBigWigFile({ url }).getZoomLevels() },
  {
    reader: "BigBed",
    ranges: true,
    read: () => createBigBedFile({ url, schema: bed3Schema }).getHeader(),
  },
  {
    reader: "BAM",
    ranges: true,
    read: () => createBamFile({ url, indexUrl: `${url}.bai` }).getHeader(),
  },
  {
    reader: "TwoBit",
    ranges: true,
    read: () => createTwoBitFile({ url }).read({ chromosome: "chr1", start: 0, end: 10 }),
  },
  { reader: "chrom.sizes", ranges: false, read: () => readChromSizes({ url }) },
  { reader: "cytoband", ranges: false, read: () => readCytobands({ url }) },
];

// A 200 to a range request means the host ignores ranges and is sending the whole file.
it.each(
  firstReads.flatMap(({ ranges, ...row }) =>
    [404, ...(ranges ? [200] : [])].map((status) => ({ ...row, status })),
  ),
)("reports a $status response to a $reader read with its status", async ({ read, status }) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => new Response(status === 200 ? "whole file" : null, { status })),
  );

  const error = await read().catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(HttpStatusError);
  expect(error).toMatchObject({ status });
});
