// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { hg38, type TrackFetchContext } from "@weng-lab/genomebrowser";
import {
  clinGenHaploModule,
  clinGenTriploModule,
  clinGenGeneDiseaseModule,
  clinGenCspecModule,
  type ClinGenConfig,
  type ClinGenData,
} from "@weng-lab/genomebrowser-tracks/clingen";
import { clinGenFiles, clinGenResources, serveClinGen } from "../fixtures/clingen";
import { mountTrack, type MountedTrack } from "../mountTrack";

const modules = [
  clinGenHaploModule,
  clinGenTriploModule,
  clinGenGeneDiseaseModule,
  clinGenCspecModule,
] as const;
const region = { chromosome: "chr17", start: 43_000_000, end: 43_100_000 };
const closeUp = { ...region, start: 43_050_000, end: 43_051_000 };
const mounts: MountedTrack[] = [];
function context(
  module = modules[0] as (typeof modules)[number],
  testRegion = region,
): TrackFetchContext<ClinGenConfig> {
  return {
    track: module.create({ base: { id: "clinical", title: "ClinGen" }, config: {} }),
    demand: {
      assembly: hg38,
      region: testRegion,
      visibleRegion: testRegion,
      width: 1000,
      basePairDetail: false,
    },
    resources: clinGenResources(),
  };
}
async function mount(
  module: (typeof modules)[number],
  display: "dense" | "pack" | "full" = "pack",
  testRegion = region,
  data?: ClinGenData,
  visibleRegion = testRegion,
) {
  const view = await mountTrack({
    module,
    track: { base: { id: "clinical", title: "Clinical track", display }, config: {} },
    region: testRegion,
    visibleRegion,
    assembly: hg38,
    data,
  });
  mounts.push(view);
  return view;
}
afterEach(async () => {
  for (const view of mounts.splice(0)) await view.unmount();
  vi.unstubAllGlobals();
});

describe("four hg38 ClinGen sources", () => {
  it("decodes each source's distinct named fields and preserves UCSC colors and coordinates", async () => {
    const fetch = serveClinGen();
    const results = await Promise.all(modules.map((module) => module.fetch(context(module))));
    expect(results.map((data) => (data.kind === "features" ? data.items.length : -1))).toEqual([
      1, 1, 2, 1,
    ]);
    const [haplo, triplo, validity, cspec] = results;
    expect(haplo).toMatchObject({
      kind: "features",
      items: [
        {
          kind: "haplo",
          name: "BRCA1",
          start: 43044294,
          end: 43170327,
          score: 0,
          haploScore: "3",
          haploDescription: "Sufficient evidence for dosage pathogenicity",
          color: "rgb(255,0,0)",
          mondoID: "MONDO:0700268",
        },
      ],
    });
    expect(triplo).toMatchObject({
      kind: "features",
      items: [{ kind: "triplo", triploScore: "0", color: "rgb(128,128,128)" }],
    });
    expect(validity).toMatchObject({
      kind: "features",
      items: [
        {
          kind: "gene-disease",
          name: "Fanconi anemia, complementation group S",
          geneSymbol: "BRCA1",
          HGNCid: "HGNC:1100",
          MONDOid: "MONDO:0054748",
          Classification: "Definitive",
          Inheritance: "AR",
          color: "rgb(120,0,170)",
        },
        { kind: "gene-disease", Inheritance: "AD", ClinGenURL: "CGGCIEX:assertion_9972" },
      ],
    });
    expect(cspec).toMatchObject({
      kind: "features",
      items: [
        { kind: "cspec", name: "BRCA1", end: 43170245, status: "Released", color: "rgb(0,0,0)" },
      ],
    });
    const requestCount = fetch.mock.calls.length;
    const aborted = context();
    const controller = new AbortController();
    controller.abort();
    await expect(
      clinGenHaploModule.fetch({ ...aborted, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).toHaveBeenCalledTimes(requestCount);
  });

  it("rejects the wrong AutoSQL layout, wrong assembly, unavailable sources, and bounds large queries", async () => {
    serveClinGen({ ...clinGenFiles, clinGenTriplo: clinGenFiles.clinGenHaplo });
    await expect(clinGenTriploModule.fetch(context(clinGenTriploModule))).rejects.toThrow(
      "AutoSQL columns",
    );
    const missing = context();
    serveClinGen({});
    await expect(clinGenHaploModule.fetch(missing)).rejects.toThrow("404");
    await expect(
      clinGenHaploModule.fetch({
        ...missing,
        demand: { ...missing.demand, assembly: { id: "hg19", chromosomes: hg38.chromosomes } },
      }),
    ).rejects.toThrow("hg38");
    const fetch = serveClinGen();
    expect(
      await clinGenHaploModule.fetch(
        context(clinGenHaploModule, { ...region, start: 0, end: 100_000_000 }),
      ),
    ).toEqual({ kind: "detail-required" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["dense", "pack", "full"] as const)(
    "renders %s intervals with source colors, viewport clipping, labels and overlapping records",
    async (display) => {
      serveClinGen();
      for (const module of modules) {
        const view = await mount(module, display);
        const rects = [...view.content.querySelectorAll<SVGRectElement>("[data-clingen-interval]")];
        expect(rects).toHaveLength(module === clinGenGeneDiseaseModule ? 2 : 1);
        expect(Number(rects[0].getAttribute("x"))).toBeCloseTo(442.94);
        expect(Number(rects[0].getAttribute("width"))).toBeCloseTo(557.06);
        expect(view.content.querySelectorAll("[data-clingen-label]").length).toBe(
          display === "dense" ? 0 : rects.length,
        );
        expect(view.trackStore.getState().getTrack("clinical")!.base.height).toBe(
          module === clinGenGeneDiseaseModule && display !== "dense" ? 36 : 18,
        );
        expect(await view.hover(view.content.querySelector("[data-clingen-feature]")!)).toContain(
          "chr17:43,044,295–",
        );
        const zoomed = await mount(module, display, closeUp);
        const rect = zoomed.content.querySelector("[data-clingen-interval]")!;
        expect(rect.getAttribute("x")).toBe("0");
        expect(rect.getAttribute("width")).toBe("1000");
      }
    },
  );

  it.each([
    {
      module: clinGenHaploModule,
      links: ["https://search.clinicalgenome.org/kb/gene-dosage/BRCA1"],
      text: "Sufficient evidence for dosage pathogenicity",
    },
    {
      module: clinGenTriploModule,
      links: ["https://search.clinicalgenome.org/kb/gene-dosage/BRCA1"],
      text: "No evidence available",
    },
    {
      module: clinGenGeneDiseaseModule,
      links: [
        "https://search.clinicalgenome.org/kb/gene-validity/CGGV%3Aassertion_aa39798d-9b6e-430d-8bc1-2a01f81f1f72-2020-05-14T003137.538Z",
      ],
      text: "Fanconi anemia, complementation group S",
    },
    {
      module: clinGenCspecModule,
      links: [
        "https://cspec.genome.network/cspec/ui/svi/doc/GN092",
        "http://clinicalgenome.org/affiliation/50087",
      ],
      text: "ENIGMA BRCA1 and BRCA2 Variant Curation Expert Panel",
    },
  ])(
    "opens safe source-specific details and links for $module.type",
    async ({ module, links, text }) => {
      serveClinGen();
      const view = await mount(module);
      await view.click(view.content.querySelector("[data-clingen-feature]")!);
      const dialog = document.querySelector('[role="dialog"]')!;
      expect(dialog.textContent).toContain("Clinical track (hg38)");
      expect(dialog.textContent).toContain("All source fields");
      expect([...dialog.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual(
        links,
      );
      expect(dialog.textContent).toContain(text);
      await view.settle(() =>
        [...dialog.querySelectorAll("button")]
          .find((button) => button.textContent === "Close")!
          .click(),
      );
    },
  );

  it("does not execute source HTML or accept javascript links, and clears stale details", async () => {
    serveClinGen();
    const data = await clinGenCspecModule.fetch(context(clinGenCspecModule));
    if (data.kind !== "features") throw Error("Expected features");
    const unsafe: ClinGenData = {
      kind: "features",
      items: data.items.map((item) =>
        item.kind === "cspec"
          ? {
              ...item,
              disease:
                '<a href="javascript:alert(1)">Unsafe disease</a><img src=x onerror="alert(1)">',
              panel: "",
            }
          : item,
      ),
    };
    const view = await mount(clinGenCspecModule, "pack", region, unsafe);
    await view.click(view.content.querySelector("[data-clingen-feature]")!);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Unsafe disease");
    expect(dialog.querySelector("img, script, a")).toBeNull();
    await view.settle(() =>
      view.trackStore.getState().updateTrack("clinical", { base: { display: "full" } }),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps empty regions small and Full mode height independent of offscreen overscan", async () => {
    serveClinGen();
    const empty = await mount(clinGenHaploModule, "full", {
      ...region,
      start: 1_000_000,
      end: 1_001_000,
    });
    expect(empty.content.querySelector("[data-clingen-feature]")).toBeNull();
    expect(empty.trackStore.getState().getTrack("clinical")!.base.height).toBe(18);
    const data = await clinGenHaploModule.fetch(context());
    if (data.kind !== "features") throw Error("Expected features");
    const overscan: ClinGenData = {
      kind: "features",
      items: [
        ...data.items,
        { ...data.items[0], name: "Offscreen", start: 43210000, end: 43220000 },
      ],
    };
    const full = await mount(
      clinGenHaploModule,
      "full",
      { ...region, end: 43300000 },
      overscan,
      region,
    );
    expect(full.content.querySelectorAll("[data-clingen-feature]")).toHaveLength(2);
    expect(full.trackStore.getState().getTrack("clinical")!.base.height).toBe(18);
  });
});
