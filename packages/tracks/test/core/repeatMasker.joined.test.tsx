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
import { joinedRepeatColumns, serveBigRmsk, singleRepeatFile } from "../fixtures/bigRmsk";

const region = { chromosome: "chr1", start: 8889, end: 35190 };
function createTrack() {
  return module.create({
    base: { id: "repeats", title: "RepeatMasker" },
    config: {
      sources: { ...sources, joined: "https://users.wenglab.org/niship/bigRmskExample.bb" },
      view: "joined",
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
type JoinedData = Extract<RepeatMaskerData, { view: "joined" }>["data"];
async function fetchView(context: TrackFetchContext<RepeatMaskerConfig>) {
  const result = await module.fetch(context);
  if (result.view !== "joined") throw new Error("Expected joined data");
  return result.data;
}
function markup(
  data: JoinedData,
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
                data={{ view: "joined", url: track.config.sources.joined, data }}
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

describe("RepeatMasker joined view", () => {
  it("reads the hg38 example and renders aligned coverage rather than visualization bounds", async () => {
    serveBigRmsk();
    const rows = await fetchView(context());
    expect(rows).toHaveLength(28);
    const repeat = rows.find((row) => row.name === "L1MC#LINE/L1")!;
    expect(repeat).toMatchObject({
      start: 9267,
      end: 17123,
      score: 242,
      repeatName: "L1MC",
      repeatClass: "LINE",
      repeatFamily: "L1",
      blockCount: 3,
      blockStarts: [-1, 2235, -1],
      alignedBlocks: [{ chromosome: "chr1", start: 11502, end: 11676 }],
      fields: [],
    });
    const view = markup([repeat], "dense");
    const block = view.querySelector("[data-bigrmsk-block]")!;
    expect(Number(block.getAttribute("x"))).toBeCloseTo(((11502 - 8889) * 1000) / (35190 - 8889));
    expect(Number(block.getAttribute("width"))).toBeCloseTo((174 * 1000) / (35190 - 8889));
    expect(block.getAttribute("fill")).toBe("#ff7f0e");
    expect(view.querySelector("[data-bigrmsk-context]")).toBeNull();
    expect(view.querySelector("text")).toBeNull();
    expect(
      markup([repeat], "pack", { chromosome: "chr1", start: 12000, end: 12500 }).querySelector(
        "[data-bigrmsk-repeat]",
      ),
    ).toBeNull();
    const Tooltip = module.tooltipComponent!;
    const tooltip = renderToStaticMarkup(
      <svg>
        <Tooltip item={repeat} context={createTrack()} />
      </svg>,
    );
    expect(tooltip).toContain("24.2%");
    expect(tooltip).toContain("chr1:11,503\u201311,676");
    expect(tooltip).toContain("LINE");
  });

  it("renders joined negative-strand blocks and keeps signed consensus overlap out of coverage", async () => {
    serveBigRmsk(singleRepeatFile(joinedRepeatColumns));
    const testRegion = { chromosome: "chr1", start: 100, end: 200 };
    const rows = await fetchView(context(testRegion));
    expect(rows[0]!.alignedBlocks).toEqual([
      { chromosome: "chr1", start: 110, end: 130 },
      { chromosome: "chr1", start: 150, end: 170 },
    ]);
    const view = markup(rows, "pack", testRegion);
    expect(view.querySelectorAll("[data-bigrmsk-block]")).toHaveLength(2);
    expect(view.querySelector("[data-bigrmsk-join]")?.getAttribute("data-consensus-gap")).toBe(
      "-5",
    );
    expect(view.querySelector("[data-bigrmsk-block]")?.tagName.toLowerCase()).toBe("rect");
    expect(Number(view.querySelector("[data-bigrmsk-block]")?.getAttribute("x"))).toBe(100);
    expect(view.querySelector("[data-bigrmsk-label]")?.textContent).toBe("L1");
    const full = markup(rows, "full", testRegion);
    expect(full.querySelectorAll("[data-bigrmsk-context]")).toHaveLength(2);
    expect(full.textContent).toContain("10 bp");
    expect(full.textContent).toContain("30 bp");
    const hidden = markup(rows, "full", testRegion, {
      showLabels: false,
      showUnalignedExtents: false,
    });
    expect(hidden.querySelector("[data-bigrmsk-label]")).toBeNull();
    expect(hidden.querySelector("[data-bigrmsk-context]")).toBeNull();
  });

  it.each(["pack", "full"] as const)(
    "draws repeated strand arrows inside %s rectangles for both directions",
    async (mode) => {
      const testRegion = { chromosome: "chr1", start: 100, end: 200 };
      for (const strand of ["+", "-"] as const) {
        const columns: string[] = [...joinedRepeatColumns];
        columns[2] = strand;
        serveBigRmsk(singleRepeatFile(columns));
        const rows = await fetchView(context(testRegion));
        const view = markup(rows, mode, testRegion);
        const arrows = view.querySelectorAll("[data-bigrmsk-strand]");
        expect(arrows).toHaveLength(2);
        for (const arrow of arrows) {
          expect(arrow.getAttribute("data-bigrmsk-strand")).toBe(strand);
          expect(arrow.getAttribute("stroke")).toBe("#ffffff");
          const rectangle = arrow.parentElement!.querySelector("rect")!;
          expect(rectangle.hasAttribute("data-bigrmsk-block")).toBe(true);
          const left = Number(rectangle.getAttribute("x"));
          const top = Number(rectangle.getAttribute("y"));
          const right = left + Number(rectangle.getAttribute("width"));
          const bottom = top + Number(rectangle.getAttribute("height"));
          const points = arrow
            .getAttribute("d")!
            .match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)!
            .map(Number);
          expect(points.length).toBeGreaterThan(6);
          expect(strand === "+" ? points[2]! > points[0]! : points[2]! < points[0]!).toBe(true);
          for (let index = 0; index < points.length; index += 2) {
            expect(points[index]).toBeGreaterThan(left);
            expect(points[index]).toBeLessThan(right);
            expect(points[index + 1]).toBeGreaterThan(top);
            expect(points[index + 1]).toBeLessThan(bottom);
          }
        }
      }
    },
  );

  it("keeps arrows within clipped blocks and omits them when fragments are too narrow", async () => {
    serveBigRmsk(singleRepeatFile(joinedRepeatColumns));
    const rows = await fetchView(context({ chromosome: "chr1", start: 100, end: 200 }));
    const clipped = markup(rows, "pack", { chromosome: "chr1", start: 129, end: 151 });
    expect(clipped.querySelectorAll("[data-bigrmsk-strand]")).toHaveLength(2);
    for (const arrow of clipped.querySelectorAll("[data-bigrmsk-strand]")) {
      const points = arrow
        .getAttribute("d")!
        .match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)!
        .map(Number);
      for (let index = 0; index < points.length; index += 2) {
        expect(points[index]).toBeGreaterThan(0);
        expect(points[index]).toBeLessThan(1000);
      }
    }
    const narrow = markup(rows, "pack", { chromosome: "chr1", start: 0, end: 10000 });
    expect(narrow.querySelectorAll("[data-bigrmsk-block]")).toHaveLength(2);
    expect(narrow.querySelector("[data-bigrmsk-strand]")).toBeNull();
    expect(
      markup(rows, "dense", { chromosome: "chr1", start: 100, end: 200 }).querySelector(
        "[data-bigrmsk-strand]",
      ),
    ).toBeNull();
  });

  it.each([
    ["mismatched arrays", 6, "4", /blockCount must match/],
    ["invalid offsets", 8, "-1,-2,-1,50,-1", /non-negative start/],
    ["blocks outside the alignment", 7, "10,200,-5,20,30", /within thickStart/],
    ["invalid numeric array fields", 7, "10,NaN,-5,20,30", /blockSizes/],
  ] as const)(
    "rejects %s through the file-reading boundary",
    async (_name, index, value, error) => {
      const columns: string[] = [...joinedRepeatColumns];
      columns[index] = value;
      serveBigRmsk(singleRepeatFile(columns));
      await expect(
        fetchView(context({ chromosome: "chr1", start: 100, end: 200 })),
      ).rejects.toThrow(error);
    },
  );

  it("preserves read cancellation", async () => {
    const fetch = serveBigRmsk();
    const controller = new AbortController();
    controller.abort();
    await expect(fetchView({ ...context(), signal: controller.signal })).rejects.toThrow(/abort/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});
