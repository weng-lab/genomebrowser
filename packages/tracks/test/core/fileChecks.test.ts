import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { checkBamFiles } from "@weng-lab/genomebrowser-tracks/bam";
import { checkBigBedFiles } from "@weng-lab/genomebrowser-tracks/bigbed";
import { checkBigWigFiles } from "@weng-lab/genomebrowser-tracks/bigwig";
import { checkCcreBigBedFiles } from "@weng-lab/genomebrowser-tracks/ccre";
import { checkGeneFiles } from "@weng-lab/genomebrowser-tracks/gene";
import {
  TrackFileError,
  type TrackFileCheckOptions,
  type TrackFileErrorCode,
} from "@weng-lab/genomebrowser-tracks/shared";

afterEach(() => vi.unstubAllGlobals());

function fixture(path: string) {
  return new Uint8Array(
    readFileSync(new URL(`../../../reader/test/fixtures/${path}`, import.meta.url)),
  );
}
const bigWig = fixture("bigwig/basic.bw");
const bed6 = fixture("bigbed/basic.bb");
const bam = fixture("bam/bamExample.bam");
const bai = fixture("bam/bamExample.bam.bai");

// A copy of the BED6 fixture whose header declares other column counts, standing in for the
// layouts of other BigBed files. Checks read only the header.
function bigBedWithColumns(fieldCount: number, definedFieldCount: number) {
  const bytes = bed6.slice();
  const view = new DataView(bytes.buffer);
  view.setUint16(32, fieldCount, true);
  view.setUint16(34, definedFieldCount, true);
  return bytes;
}

type HostedFiles = Record<string, Uint8Array | number>;

// Serves each file as a host that supports byte-range requests would. A number answers with that
// status instead; an unlisted URL fails as fetch does when a host is unreachable or CORS blocks it.
function host(files: HostedFiles) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      init?.signal?.throwIfAborted();
      const file = files[String(input)];
      if (file === undefined) throw new TypeError("Failed to fetch");
      if (typeof file === "number") return new Response(null, { status: file });
      const range = /^bytes=(\d+)-(\d+)$/.exec(new Headers(init?.headers).get("Range") ?? "");
      if (!range) return new Response(file.slice(), { status: 200 });
      const start = Number(range[1]);
      const end = Math.min(Number(range[2]), file.length - 1);
      return new Response(file.slice(start, end + 1), {
        status: 206,
        headers: { "Content-Range": `bytes ${start}-${end}/${file.length}` },
      });
    }),
  );
}

const url = "https://example.test/data/file";
const indexUrl = `${url}.bai`;

function failure(code: TrackFileErrorCode, field: string, status?: number) {
  return expect.objectContaining({ name: "TrackFileError", code, field, status });
}

// Each row is a file someone might add as a track of some type, and whether that track can read it.
it.each<{ added: string; files: HostedFiles; check: () => Promise<unknown>; outcome: unknown }>([
  {
    added: "a BigWig file as BigWig",
    files: { [url]: bigWig },
    check: () => checkBigWigFiles({ url }),
    outcome: { url },
  },
  {
    added: "a BigBed file as BigWig",
    files: { [url]: bed6 },
    check: () => checkBigWigFiles({ url }),
    outcome: failure("UNREADABLE", "url"),
  },
  {
    added: "a BED6 file as BigBed",
    files: { [url]: bed6 },
    check: () => checkBigBedFiles({ url }),
    outcome: { url, bedSchema: "bed6" },
  },
  {
    added: "a bed3+3 file as BigBed",
    files: { [url]: bigBedWithColumns(6, 3) },
    check: () => checkBigBedFiles({ url }),
    outcome: { url, bedSchema: "bed3" },
  },
  {
    added: "a BED12 file as BigBed",
    files: { [url]: bigBedWithColumns(12, 12) },
    check: () => checkBigBedFiles({ url }),
    outcome: { url, bedSchema: "bed9" },
  },
  {
    added: "a BED6 file as BigBed read as BED4",
    files: { [url]: bed6 },
    check: () => checkBigBedFiles({ url, bedSchema: "bed4" }),
    outcome: { url, bedSchema: "bed4" },
  },
  {
    added: "a narrowPeak (bed6+4) file as BigBed read as BED9",
    files: { [url]: bigBedWithColumns(10, 6) },
    check: () => checkBigBedFiles({ url, bedSchema: "bed9" }),
    outcome: failure("UNREADABLE", "url"),
  },
  {
    added: "a BigGenePred file as gene",
    files: { [url]: bigBedWithColumns(20, 12) },
    check: () => checkGeneFiles({ url }),
    outcome: { url },
  },
  {
    added: "a BED6 file as gene",
    files: { [url]: bed6 },
    check: () => checkGeneFiles({ url }),
    outcome: failure("UNREADABLE", "url"),
  },
  {
    added: "a cCRE (bed9+1) file as cCRE",
    files: { [url]: bigBedWithColumns(10, 9) },
    check: () => checkCcreBigBedFiles({ url }),
    outcome: { url },
  },
  {
    added: "a narrowPeak (bed6+4) file as cCRE",
    files: { [url]: bigBedWithColumns(10, 6) },
    check: () => checkCcreBigBedFiles({ url }),
    outcome: failure("UNREADABLE", "url"),
  },
  {
    added: "a BAM file and its index as BAM",
    files: { [url]: bam, [indexUrl]: bai },
    check: () => checkBamFiles({ url, indexUrl }),
    outcome: { url, indexUrl },
  },
  {
    added: "a BAM file given as its own index",
    files: { [url]: bam },
    check: () => checkBamFiles({ url, indexUrl: url }),
    outcome: failure("UNREADABLE", "indexUrl"),
  },
  {
    added: "a BAM file whose index is missing",
    files: { [url]: bam, [indexUrl]: 404 },
    check: () => checkBamFiles({ url, indexUrl }),
    outcome: failure("UNREACHABLE", "indexUrl", 404),
  },
  {
    added: "a BigWig file as BAM",
    files: { [url]: bigWig, [indexUrl]: bai },
    check: () => checkBamFiles({ url, indexUrl }),
    outcome: failure("UNREADABLE", "url"),
  },
])("checks $added", async ({ files, check, outcome }) => {
  host(files);

  const result = await check().catch((error: unknown) => error);

  expect(result).toEqual(outcome);
});

const checks = [
  {
    track: "BigWig",
    check: (url: string, options: TrackFileCheckOptions) => checkBigWigFiles({ url }, options),
  },
  {
    track: "BigBed",
    check: (url: string, options: TrackFileCheckOptions) => checkBigBedFiles({ url }, options),
  },
  {
    track: "gene",
    check: (url: string, options: TrackFileCheckOptions) => checkGeneFiles({ url }, options),
  },
  {
    track: "cCRE",
    check: (url: string, options: TrackFileCheckOptions) => checkCcreBigBedFiles({ url }, options),
  },
  {
    track: "BAM",
    check: (url: string, options: TrackFileCheckOptions) =>
      checkBamFiles({ url, indexUrl: `${url}.bai` }, options),
  },
];

const unreadableUrls: {
  given: string;
  url: string;
  files: HostedFiles;
  code: TrackFileErrorCode;
  status?: number;
}[] = [
  { given: "a missing file", url, files: { [url]: 404 }, code: "UNREACHABLE", status: 404 },
  {
    given: "a host that ignores range requests",
    url,
    files: { [url]: 200 },
    code: "NO_RANGE_SUPPORT",
    status: 200,
  },
  { given: "an unreachable host", url, files: {}, code: "UNREACHABLE" },
  { given: "a relative URL", url: "data/file", files: {}, code: "INVALID_URL" },
];

// Each row is a URL whose file cannot be read at all, which every track type reports the same way.
it.each(unreadableUrls.flatMap((row) => checks.map((check) => ({ ...row, ...check }))))(
  "reports $given as the URL of a $track track",
  async ({ url, files, check, code, status }) => {
    host(files);

    const error = await check(url, {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TrackFileError);
    expect(error).toMatchObject({ code, field: "url", status });
  },
);

it.each(checks)(
  "rejects with the signal's reason when a $track check is aborted",
  async ({ check }) => {
    // A host that does not answer, so the check is still waiting when it is aborted.
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        (_input, init) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)),
          ),
      ),
    );
    const controller = new AbortController();
    const reason = new DOMException("Check timed out", "AbortError");

    const checking = check(url, { signal: controller.signal });
    controller.abort(reason);

    await expect(checking).rejects.toBe(reason);
  },
);
