import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { createBigBedFile, bed3Schema } from "../src/lib";
const bytes = new Uint8Array(
  readFileSync(new URL("./fixtures/bigbed/repeatmasker.bb", import.meta.url)),
);
afterEach(() => vi.unstubAllGlobals());
function serve(poisonHttpCache = false) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    const match = /bytes=(\d+)-(\d+)/.exec(new Headers(init?.headers).get("Range")!)!;
    const start = Number(match[1]);
    const end = Math.min(Number(match[2]), bytes.length - 1);
    const body = bytes.slice(start, end + 1);
    // Reproduce a browser cache returning zero-filled 206 bodies with the right length.
    if (poisonHttpCache && init?.cache !== "no-store") body.fill(0);
    return new Response(body, {
      status: 206,
      headers: poisonHttpCache ? {} : { "Content-Range": `bytes ${start}-${end}/${bytes.length}` },
    });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
it("exposes immutable schema metadata and indexed BigBed coverage summaries", async () => {
  const fetch = serve();
  const file = createBigBedFile({ url: "https://example.test/repeats.bb", schema: bed3Schema });
  const metadata = await file.getMetadata();
  expect(metadata).toMatchObject({ fieldCount: 17, definedFieldCount: 6, zoomLevels: [1000] });
  expect(metadata.autoSql).toContain("uint repeatId;");
  expect(Object.isFrozen(metadata)).toBe(true);
  const count = fetch.mock.calls.length;
  expect(await file.getMetadata()).toBe(metadata);
  expect(fetch).toHaveBeenCalledTimes(count);
  const region = { chromosome: "chr1", start: 0, end: 3000 };
  expect(await file.readZoomLevel(region, 1000)).toEqual([
    {
      kind: "summary",
      ...region,
      validCount: 1800,
      min: 1,
      max: 2,
      sum: 1980,
      sumSquares: 2340,
      mean: 1.1,
    },
  ]);
  await expect(file.readZoomLevel(region, 999)).rejects.toThrow("not available");
  await expect(file.readZoomLevel(region, 0)).rejects.toThrow("positive");
  expect(await file.readZoomLevel({ ...region, chromosome: "missing" }, 1000)).toEqual([]);
  const controller = new AbortController();
  const reason = new DOMException("cancelled", "AbortError");
  controller.abort(reason);
  await expect(file.getMetadata({ signal: controller.signal })).rejects.toBe(reason);
  await expect(file.readZoomLevel(region, 1000, { signal: controller.signal })).rejects.toBe(
    reason,
  );
  expect(await file.read(region)).toHaveLength(11);
});

it("reads metadata, records, and zooms when the browser HTTP cache contains corrupt partial responses", async () => {
  const fetch = serve(true);
  const file = createBigBedFile({ url: "https://example.test/repeats.bb", schema: bed3Schema });
  const metadata = await file.getMetadata();
  expect(metadata).toMatchObject({ fieldCount: 17, definedFieldCount: 6, zoomLevels: [1000] });
  const requests = fetch.mock.calls.length;
  expect(await file.getMetadata()).toBe(metadata);
  expect(fetch).toHaveBeenCalledTimes(requests);
  const region = { chromosome: "chr1", start: 0, end: 3000 };
  expect(await file.read(region)).toHaveLength(11);
  expect(await file.readZoomLevel(region, 1000)).toEqual([
    expect.objectContaining({ kind: "summary", mean: 1.1, validCount: 1800 }),
  ]);
});
