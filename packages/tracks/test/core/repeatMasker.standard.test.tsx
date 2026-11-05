import { PanStatusContext } from "../../../core/src/browser/viewport/useBrowserPan";
import { BrowserSvgContext } from "../../../core/src/browser/svg/browserSvgState";
// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTrackStore,
  type TrackFetchContext,
  type TrackResources,
} from "@weng-lab/genomebrowser";
import {
  repeatMaskerModule as module,
  type RepeatMaskerConfig,
  type RepeatMaskerData,
} from "@weng-lab/genomebrowser-tracks/repeatmasker";
import { sources } from "../fixtures/repeatMasker";

import { TrackRuntime } from "../../../core/src/modules/trackRuntimeState";
import { TestBrowser } from "../testBrowser";
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
function markup(
  data: StandardData,
  mode: "dense" | "pack" | "full",
  testRegion = region,
  config: Partial<RepeatMaskerConfig> = {},
) {
  const Renderer = module.render[mode];
  const track = createTrack();
  const element = document.createElement("div");
  element.innerHTML = renderToStaticMarkup(
    <TestBrowser trackStore={createTrackStore({ modules: [module], tracks: [track] })}>
      <PanStatusContext.Provider value={() => false}>
        <BrowserSvgContext.Provider value={null}>
          <TrackRuntime.Provider value={{ context: track, interaction: null }}>
            <svg>
              <Renderer
                id="repeats"
                color={track.base.color}
                height={24}
                width={1000}
                data={{ view: "standard", url: track.config.sources.standard, data }}
                config={{ ...track.config, ...config }}
                region={testRegion}
                visibleRegion={testRegion}
              />
            </svg>
          </TrackRuntime.Provider>
        </BrowserSvgContext.Provider>
      </PanStatusContext.Provider>
    </TestBrowser>,
  );
  return element;
}

afterEach(() => vi.unstubAllGlobals());

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
    const Tooltip = module.tooltipComponent!;
    const tip = renderToStaticMarkup(<Tooltip item={data.repeats[2]!} context={createTrack()} />);
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
    const full = markup(data, "full");
    expect(full.querySelectorAll("[data-repeatmasker-category]")).toHaveLength(10);
    expect(full.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
    const blocks = full.querySelectorAll("[data-repeatmasker-block]");
    expect(blocks[0]!.getAttribute("y")).not.toBe(blocks[1]!.getAttribute("y"));
    expect(Number(blocks[0]!.getAttribute("x"))).toBeCloseTo(100 / 3);
    expect(Number(blocks[0]!.getAttribute("width"))).toBeCloseTo(60);
    expect(blocks[0]!.getAttribute("fill")).toBe("rgb(69,69,69)");
    expect(full.querySelector("[data-repeatmasker-strand='-']")).not.toBeNull();
    const pack = markup(data, "pack");
    expect(pack.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
    expect(pack.querySelector("[data-repeatmasker-label]")).not.toBeNull();
    const dense = markup(data, "dense");
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
    const view = markup(data, "dense", { chromosome: "chr1", start: 0, end: 248956422 });
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
    const forward = markup({ kind: "repeats", repeats }, "dense", overlap);
    const reverse = markup({ kind: "repeats", repeats: [...repeats].reverse() }, "dense", overlap);
    const cells = forward.querySelectorAll("[data-repeatmasker-summary] rect");
    expect(cells).toHaveLength(1000);
    expect(forward.querySelector("[data-repeatmasker-block]")).toBeNull();
    expect(Array.from(cells, (cell) => cell.getAttribute("fill"))).toEqual(
      Array.from(reverse.querySelectorAll("[data-repeatmasker-summary] rect"), (cell) =>
        cell.getAttribute("fill"),
      ),
    );
    expect(cells[500]!.getAttribute("fill")).toBe("rgb(0,0,0)");
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
    const view = markup(crowded, "dense");
    expect(view.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(0);
    const cells = view.querySelectorAll("[data-repeatmasker-summary]");
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(1000);
  });
});
