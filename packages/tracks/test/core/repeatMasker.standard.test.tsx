// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { type TrackFetchContext, type TrackResources } from "@weng-lab/genomebrowser";
import {
  repeatMaskerModule as module,
  type RepeatMaskerConfig,
  type RepeatMaskerData,
} from "@weng-lab/genomebrowser-tracks/repeatmasker";
import { sources } from "../fixtures/repeatMasker";
import { mountTrack } from "../mountTrack";
import { standardRepeatFile, serveRepeats } from "../fixtures/repeatMaskerStandard";

const region = { chromosome: "chr1", start: 0, end: 3000 };
function createTrack() {
  return module.create({
    base: { id: "repeats", title: "RepeatMasker" },
    config: {
      sources: { ...sources, standard: "https://users.wenglab.org/niship/hg38_ucsc_std_rmsk.bb" },
      view: "standard",
    },
  });
}
function context(testRegion = region): TrackFetchContext<RepeatMaskerConfig> {
  const values = new Map<string, unknown>();
  const resources: TrackResources = {
    get: <T,>(key: string) => values.get(key) as T | undefined,
    set: (key, value) => {
      values.set(key, value);
    },
    delete: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
  return {
    track: createTrack(),
    demand: {
      region: testRegion,
      visibleRegion: testRegion,
      assembly: { id: "hg38", chromosomes: { chr1: 248956422 } },
      width: 1000,
      basePairDetail: false,
    },
    resources,
  };
}
type StandardData = Extract<RepeatMaskerData, { view: "standard" }>["data"];
async function fetchView(context: TrackFetchContext<RepeatMaskerConfig>) {
  const result = await module.fetch(context);
  if (result.view !== "standard") throw new Error("Expected standard data");
  return result.data;
}
async function mount(
  data: StandardData | undefined,
  display: "dense" | "pack" | "full",
  testRegion = region,
  interaction?: { onClick: (item: unknown) => void },
) {
  const track = createTrack();
  return mountTrack({
    module,
    track: { base: { ...track.base, display }, config: track.config },
    interaction,
    data: data && { view: "standard", url: track.config.sources.standard, data },
    region: testRegion,
    assembly: { id: "hg38", chromosomes: { chr1: 248956422 } },
  });
}
async function markup(data: StandardData, display: "dense" | "pack" | "full", testRegion = region) {
  return (await mount(data, display, testRegion)).content;
}

afterEach(async () => {
  vi.unstubAllGlobals();
});

describe("standard RepeatMasker BED6+11", () => {
  it("decodes named attributes and preserves raw classes, signed coordinates and tooltips", async () => {
    serveRepeats(standardRepeatFile);
    const data = await fetchView(context());
    expect(data.kind).toBe("repeats");
    if (data.kind !== "repeats") throw Error("expected details");
    expect(data.repeats).toHaveLength(11);
    expect(data.repeats[2]).toMatchObject({
      chromosome: "chr1",
      start: 700,
      end: 880,
      repClass: "LINE?",
      category: "LINE",
      repFamily: "family?",
      swScore: 2500,
      milliDiv: 123,
      milliDel: 20,
      milliIns: 7,
      genoLeft: -999,
      repStart: -5,
      repEnd: 180,
      repLeft: -12,
      repeatId: 3,
      fields: [],
    });
    expect(data.repeats.map((row) => row.category)).toEqual([
      "SINE",
      "SINE",
      "LINE",
      "LTR",
      "DNA",
      "Simple",
      "Low_complexity",
      "Satellite",
      "RNA",
      "Other",
      "Unknown",
    ]);
    const fullView = await mount(data, "full");
    const full = fullView.content;
    expect(full.querySelectorAll("[data-repeatmasker-category]")).toHaveLength(10);
    expect(full.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
    const blocks = full.querySelectorAll("[data-repeatmasker-block]");
    expect(blocks[0]!.getAttribute("y")).not.toBe(blocks[1]!.getAttribute("y"));
    expect(Number(blocks[0]!.getAttribute("x"))).toBeCloseTo(100 / 3);
    expect(Number(blocks[0]!.getAttribute("width"))).toBeCloseTo(60);
    expect(blocks[0]!.getAttribute("fill")).toBe("rgb(69,69,69)");
    expect(full.querySelector("[data-repeatmasker-strand='-']")).not.toBeNull();
    // The third repeat spans [700, 880): x = 700 / 3, width = 180 / 3 at 1000 px for 3000 bp.
    const third = Array.from(blocks).find(
      (block) => Math.abs(Number(block.getAttribute("x")) - 700 / 3) < 0.01,
    )!;
    expect(Number(third.getAttribute("width"))).toBeCloseTo(60);
    const tip = await fullView.hover(third);
    for (const text of [
      "12.3%",
      "2%",
      "0.7%",
      "family?",
      "LINE?",
      "2500",
      "-999",
      "start -5; end 180; left -12",
    ])
      expect(tip).toContain(text);
    const pack = await markup(data, "pack");
    expect(pack.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
    expect(pack.querySelector("[data-repeatmasker-label]")).not.toBeNull();
    const dense = await markup(data, "dense");
    expect(dense.querySelector("[data-repeatmasker-summary]")).not.toBeNull();
    expect(dense.querySelector("[data-repeatmasker-block]")).toBeNull();
    expect(dense.querySelector("[data-repeatmasker-label]")).toBeNull();
  });
  it("rejects unrelated layouts and mismatched AutoSQL without filename inference", async () => {
    const bed6 = standardRepeatFile.slice();
    new DataView(bed6.buffer).setUint16(32, 6, true);
    serveRepeats(bed6);
    await expect(fetchView(context())).rejects.toThrow("BED6+11");
    const wrong = standardRepeatFile.slice();
    const encoded = new TextEncoder().encode("repClass");
    const offset = new TextDecoder().decode(wrong).indexOf("repClass");
    wrong.set(new TextEncoder().encode("badClass"), offset);
    expect(encoded.length).toBe(8);
    serveRepeats(wrong);
    await expect(fetchView(context())).rejects.toThrow("AutoSQL");
  });
  it("uses indexed zoom coverage for large regions and bounds summary DOM by viewport width", async () => {
    const fetch = serveRepeats(standardRepeatFile);
    const data = await fetchView(context({ chromosome: "chr1", start: 0, end: 248956422 }));
    expect(data.kind).toBe("summary");
    if (data.kind !== "summary") throw Error("expected summary");
    expect(data.summaries[0]).toMatchObject({ validCount: 1800, mean: 1.1 });
    expect(
      fetch.mock.calls.every(
        ([, init]) =>
          !/^bytes=(8192|8200|12000)-/.test(new Headers(init?.headers).get("Range") ?? ""),
      ),
    ).toBe(true);
    const view = await markup(data, "dense", { chromosome: "chr1", start: 0, end: 248956422 });
    expect(view.querySelectorAll("[data-repeatmasker-summary]").length).toBeLessThanOrEqual(1000);
    expect(view.textContent).toContain("Zoom in");
  });
  it("uses the known mapping when AutoSQL is absent and avoids huge raw reads without zooms", async () => {
    const bytes = standardRepeatFile.slice();
    const header = new DataView(bytes.buffer);
    header.setBigUint64(36, 0n, true);
    header.setUint16(6, 0, true);
    serveRepeats(bytes);
    const local = await fetchView(context());
    expect(local.kind).toBe("repeats");
    expect(await fetchView(context({ chromosome: "chr1", start: 0, end: 248956422 }))).toEqual({
      kind: "detail-required",
    });
  });
  it("aggregates small overlapping Dense queries without record-order-dependent shading", async () => {
    serveRepeats(standardRepeatFile);
    const data = await fetchView(context());
    if (data.kind !== "repeats") throw Error("expected details");
    // Two identical regions with different divergence shades must describe coverage,
    // rather than exposing the color of whichever individual rectangle paints last.
    const repeats = data.repeats.slice(0, 2).map((repeat, index) => ({
      ...repeat,
      milliDiv: index * 500,
      milliDel: 0,
      milliIns: 0,
    }));
    const overlap = { chromosome: "chr1", start: 100, end: 280 };
    const forward = await markup({ kind: "repeats", repeats }, "dense", overlap);
    const reverse = await markup(
      { kind: "repeats", repeats: [...repeats].reverse() },
      "dense",
      overlap,
    );
    const cells = forward.querySelectorAll("[data-repeatmasker-summary] rect");
    expect(cells).toHaveLength(1000);
    expect(forward.querySelector("[data-repeatmasker-block]")).toBeNull();
    expect(Array.from(cells, (cell) => cell.getAttribute("fill"))).toEqual(
      Array.from(reverse.querySelectorAll("[data-repeatmasker-summary] rect"), (cell) =>
        cell.getAttribute("fill"),
      ),
    );
    expect(cells[500]!.getAttribute("fill")).toBe("rgb(0,0,0)");
    // Unsorted, partially overlapping regions cover [100, 280), not 240 distinct bases.
    const partial = [
      { ...repeats[0]!, start: 200, end: 280 },
      { ...repeats[1]!, start: 100, end: 260 },
    ];
    for (const records of [partial, [...partial].reverse()]) {
      const view = await markup({ kind: "repeats", repeats: records }, "dense", {
        chromosome: "chr1",
        start: 0,
        end: 360000,
      });
      expect(view.querySelector("[data-repeatmasker-summary] rect")!.getAttribute("fill")).toBe(
        "rgb(115,115,115)",
      );
    }
  });
  it("bounds Dense coverage DOM by plot width for crowded repeats", async () => {
    serveRepeats(standardRepeatFile);
    const data = await fetchView(context());
    if (data.kind !== "repeats") throw Error("expected details");
    const crowded: StandardData = {
      kind: "repeats",
      repeats: Array.from({ length: 1500 }, (_, index) => ({
        ...data.repeats[0]!,
        repeatId: index,
      })),
    };
    const view = await markup(crowded, "dense");
    expect(view.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(0);
    const cells = view.querySelectorAll("[data-repeatmasker-summary]");
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(1000);
  });
  it("separates covered bases from overlap depth in a partially covered Dense pixel", async () => {
    serveRepeats(standardRepeatFile);
    const onClick = vi.fn<(item: unknown) => void>();
    // No literal data: the module's real fetch reads the fixture for the mounted view.
    const view = await mount(
      undefined,
      "dense",
      { chromosome: "chr1", start: 0, end: 360000 },
      {
        onClick,
      },
    );
    // The first 360-bp pixel contains two repeats, both covering [100, 280).
    // Their union is 180 bp (half a pixel), while their total overlap is 360 bp.
    const cell = view.content.querySelector("[data-repeatmasker-summary]")!;
    await view.click(cell);
    expect(onClick).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "summary", start: 0, end: 360, validCount: 180, mean: 2 }),
      expect.objectContaining({ base: expect.objectContaining({ display: "dense" }) }),
    );
    expect(cell.querySelector("rect")!.getAttribute("fill")).toBe("rgb(115,115,115)");
    const tip = await view.hover(cell);
    expect(tip).toContain("Covered bases (estimated)180.00");
    expect(tip).toContain("Mean overlap2.00");
  });
});
