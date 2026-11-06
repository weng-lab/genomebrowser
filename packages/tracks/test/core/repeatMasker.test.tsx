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
import { TrackRuntime } from "../../../core/src/modules/trackRuntimeState";
import { PanStatusContext } from "../../../core/src/browser/viewport/useBrowserPan";
import { BrowserSvgContext } from "../../../core/src/browser/svg/browserSvgState";
import { TestBrowser } from "../testBrowser";
import { standardRepeatFile } from "../fixtures/repeatMaskerStandard";
import { exampleBigRmsk } from "../fixtures/bigRmsk";
import { sources, serveRepeatMasker } from "../fixtures/repeatMasker";

const region = { chromosome: "chr1", start: 0, end: 3000 };
function track(config: Partial<RepeatMaskerConfig> = {}) {
  return module.create({
    base: { id: "repeats", title: "RepeatMasker" },
    config: { sources, ...config },
  });
}
function context(
  config: Partial<RepeatMaskerConfig> = {},
  testRegion = region,
): TrackFetchContext<RepeatMaskerConfig> {
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
    track: track(config),
    resources,
    demand: {
      region: testRegion,
      visibleRegion: testRegion,
      width: 1000,
      assembly: { id: "hg38", chromosomes: { chr1: 248956422 } },
      basePairDetail: false,
    },
  };
}
function markup(
  data: RepeatMaskerData,
  mode: "full" | "pack" | "dense",
  config: Partial<RepeatMaskerConfig> = {},
) {
  const instance = track(config),
    Renderer = module.render[mode];
  const element = document.createElement("div");
  element.innerHTML = renderToStaticMarkup(
    <TestBrowser trackStore={createTrackStore({ modules: [module], tracks: [instance] })}>
      <PanStatusContext.Provider value={() => false}>
        <BrowserSvgContext.Provider value={null}>
          <TrackRuntime.Provider value={{ context: instance, interaction: null }}>
            <svg>
              <Renderer
                id="repeats"
                config={instance.config}
                data={data}
                color="#333333"
                height={240}
                width={1000}
                region={region}
                visibleRegion={region}
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

describe("RepeatMasker public module", () => {
  it("selects only the active source, preserves typed annotations, and renders every display", async () => {
    const fetch = serveRepeatMasker(),
      ctx = context();
    const standard = await module.fetch(ctx);
    expect(fetch.mock.calls.every(([url]) => String(url) === sources.standard)).toBe(true);
    expect(standard).toMatchObject({
      view: "standard",
      data: {
        kind: "repeats",
        repeats: expect.arrayContaining([
          expect.objectContaining({ swScore: 2500, repClass: "SINE" }),
        ]),
      },
    });
    for (const mode of ["full", "pack"] as const) {
      expect(markup(standard, mode).querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
    }
    expect(markup(standard, "dense").querySelector("[data-repeatmasker-summary]")).not.toBeNull();
    expect(markup(standard, "full").querySelectorAll("[data-repeatmasker-category]")).toHaveLength(
      10,
    );
    const count = fetch.mock.calls.length;
    const joined = await module.fetch({ ...ctx, track: track({ view: "joined" }) });
    expect(fetch.mock.calls.slice(count).every(([url]) => String(url) === sources.joined)).toBe(
      true,
    );
    expect(joined).toMatchObject({
      view: "joined",
      data: [
        expect.objectContaining({
          blockSizes: [10, 20, -5, 20, 30],
          alignedBlocks: [
            { chromosome: "chr1", start: 110, end: 130 },
            { chromosome: "chr1", start: 150, end: 170 },
          ],
        }),
      ],
    });
    for (const mode of ["full", "pack", "dense"] as const) {
      const view = markup(joined, mode, { view: "joined" });
      expect(view.querySelectorAll("[data-bigrmsk-block]")).toHaveLength(2);
      if (mode !== "dense")
        expect(view.querySelector("[data-bigrmsk-join]")?.getAttribute("data-consensus-gap")).toBe(
          "-5",
        );
    }
    expect(
      markup(joined, "full", { view: "joined" }).querySelectorAll("[data-bigrmsk-context]"),
    ).toHaveLength(2);
    expect(
      markup(joined, "full", {
        view: "joined",
        showUnalignedExtents: false,
        showLabels: false,
      }).querySelector("[data-bigrmsk-context], [data-bigrmsk-label]"),
    ).toBeNull();
    expect(
      markup(standard, "full", { view: "joined" }).querySelector("[data-repeatmasker-block]"),
    ).toBeNull();
    const Tooltip = module.tooltipComponent!;
    if (
      standard.view !== "standard" ||
      standard.data.kind !== "repeats" ||
      joined.view !== "joined"
    )
      throw Error("Expected details");
    // Tooltip dispatch follows the result, including a hover retained across a view switch.
    expect(
      renderToStaticMarkup(
        <Tooltip item={standard.data.repeats[0]!} context={track({ view: "joined" })} />,
      ),
    ).toContain("SW score");
    expect(renderToStaticMarkup(<Tooltip item={joined.data[0]!} context={track()} />)).toContain(
      "24.2%",
    );
  });

  it("rejects swapped or incompatible schemas and passes cancellation to the reader", async () => {
    serveRepeatMasker(standardRepeatFile, standardRepeatFile);
    await expect(module.fetch(context({ view: "joined" }))).rejects.toThrow("BED9+5");
    serveRepeatMasker(exampleBigRmsk);
    await expect(module.fetch(context())).rejects.toThrow("BED6+11");
    serveRepeatMasker();
    const controller = new AbortController();
    controller.abort();
    await expect(module.fetch({ ...context(), signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("uses bounded summaries for either source and avoids raw reads when joined zooms are absent", async () => {
    const wide = { chromosome: "chr1", start: 0, end: 248956422 };
    serveRepeatMasker();
    const standard = await module.fetch(context({}, wide));
    expect(standard).toMatchObject({ view: "standard", data: { kind: "summary" } });
    expect(markup(standard, "full").textContent).toContain("Zoom in");
    expect(await module.fetch(context({ view: "joined" }, wide))).toEqual({
      view: "joined-summary",
      url: sources.joined,
      data: { kind: "detail-required" },
    });
    const fetch = serveRepeatMasker(standardRepeatFile, exampleBigRmsk);
    const joined = await module.fetch(context({ view: "joined" }, wide));
    expect(joined).toMatchObject({ view: "joined-summary", data: { kind: "summary" } });
    const view = markup(joined, "dense", { view: "joined" });
    expect(view.textContent).toContain("Zoom in");
    expect(view.querySelectorAll("[data-repeatmasker-summary]").length).toBeLessThanOrEqual(1000);
    expect(view.querySelector("[data-bigrmsk-block]")).toBeNull();
    expect(fetch.mock.calls.length).toBeGreaterThan(0);
  });

  it("round-trips both sources and settings while keeping RepeatMasker instances independent", () => {
    const other = module.create({
      base: { id: "other-repeats", title: "Other repeats" },
      config: { sources, view: "standard", showLabels: true },
    });
    const repeats = track({
      view: "joined",
      showStrandArrows: false,
      highlightClassOnHover: false,
    });
    const store = createTrackStore({
      modules: [module],
      tracks: [other, repeats],
    });
    expect(
      store
        .getState()
        .updateTrack("repeats", { base: { display: "dense" }, config: { showLabels: false } }),
    ).toEqual({ ok: true });
    const saved = JSON.parse(JSON.stringify(store.getState().tracks));
    const restored = createTrackStore({
      modules: [module],
      tracks: saved,
    });
    expect(restored.getState().getTrack("other-repeats")).toEqual(other);
    expect(restored.getState().getTrack("repeats")).toMatchObject({
      base: { display: "dense" },
      config: {
        sources,
        view: "joined",
        showLabels: false,
        showStrandArrows: false,
        highlightClassOnHover: false,
      },
    });
  });
});
