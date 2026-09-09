import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTrackStore, hg38, type TrackResources } from "@weng-lab/genomebrowser";
import { rulerModule, type RulerData } from "@weng-lab/genomebrowser-tracks/ruler";
import { tickStep } from "../../src/ruler/helpers";
const { read, createFile } = vi.hoisted(() => ({ read: vi.fn(), createFile: vi.fn() }));
vi.mock("@weng-lab/genomic-reader", () => ({ createTwoBitFile: createFile }));
const region = { chromosome: "chr1", start: 100, end: 110 };
const input = { id: "ruler", title: "Reference", config: {} };
const url = "https://example.test/reference.2bit";
afterEach(() => vi.resetAllMocks());
function resources(): TrackResources {
  const map = new Map();
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    delete: (key) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}
function render(width: number, data: RulerData, sequenceUrl: string | null = url) {
  const track = rulerModule.create({ ...input, config: { sequenceUrl: sequenceUrl ?? undefined } });
  const Renderer = rulerModule.render.full;
  return renderToStaticMarkup(
    <svg>
      <Renderer
        {...track.base}
        config={track.config}
        width={width}
        region={region}
        visibleRegion={region}
        data={data}
      />
    </svg>,
  );
}
describe("ruler module", () => {
  it("creates, validates and mutates a normal track", () => {
    const track = rulerModule.create(input);
    expect(track.base.height).toBe(64);
    expect(track.config.sequenceMinPixelsPerBase).toBe(12);
    expect(() =>
      rulerModule.create({ ...input, config: { sequenceMinPixelsPerBase: 0 } }),
    ).toThrow();
    expect(() =>
      rulerModule.create({ ...input, config: { sequenceUrl: "file:///ref.2bit" } }),
    ).toThrow();
    const useTracks = createTrackStore({ modules: [rulerModule], tracks: [track] });
    expect(useTracks.getState().updateTrack("ruler", { config: { sequenceUrl: url } }).ok).toBe(
      true,
    );
    expect(useTracks.getState().tracks[0]?.config.sequenceUrl).toBe(url);
  });
  it("uses readable tick intervals at chromosome and base scale", () => {
    expect(tickStep(1000, 1000)).toBe(200);
    expect(tickStep(1, 1000)).toBe(1);
    expect(tickStep(250_000_000, 1000)).toBe(50_000_000);
    expect(render(1000, { records: [] }, null)).toContain("100");
    expect(render(1000, { records: [] }, null)).toContain("10 bp");
  });
  it("renders masked and unknown bases only above the threshold", () => {
    const data = { records: [{ ...region, sequence: "ACGTNacgtn" }] };
    expect(render(120, data)).toContain('aria-label="chr1:100 A"');
    expect(render(120, data)).toContain('aria-label="chr1:105 a"');
    expect(render(119, data)).not.toContain('aria-label="chr1:100 A"');
    expect(render(119, data)).toContain("Zoom in");
    expect(render(120, { records: [], error: "CORS" })).toContain("Reference sequence unavailable");
  });
  it("avoids broad sequence reads, caches the reader and changes sources", async () => {
    const cached = resources();
    read.mockResolvedValue([{ ...region, sequence: "ACGTNacgtn" }]);
    createFile.mockReturnValue({ read });
    const fetch = (width: number, sequenceUrl?: string) =>
      rulerModule.fetch({
        track: {
          id: "ruler",
          type: "ruler",
          display: "full",
          config: { sequenceUrl, sequenceMinPixelsPerBase: 12 },
        },
        demand: { region, width, assembly: hg38 },
        resources: cached,
      });
    await fetch(1000);
    await fetch(119, url);
    expect(createFile).not.toHaveBeenCalled();
    expect(await fetch(120, url)).toMatchObject({ records: [{ sequence: "ACGTNacgtn" }] });
    await fetch(240, url);
    expect(createFile).toHaveBeenCalledTimes(1);
    await fetch(240, "https://example.test/other.2bit");
    expect(createFile).toHaveBeenCalledTimes(2);
    read.mockRejectedValueOnce(new Error("range access denied"));
    expect(await fetch(120, url)).toEqual({ records: [], error: "range access denied" });
    expect((await fetch(120, url)).records).toHaveLength(1);
  });
});
