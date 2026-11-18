// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createBrowserStore, createTrackStore, GenomeBrowser, hg38 } from "@weng-lab/genomebrowser";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import {
  clinGenHaploModule,
  clinGenTriploModule,
  clinGenGeneDiseaseModule,
  clinGenCspecModule,
  createClinGenTrackSet,
} from "@weng-lab/genomebrowser-tracks/clingen";
import { serveClinGen } from "../fixtures/clingen";
import { exportTrackSvg } from "../exportTrackSvg";

let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  probe = undefined;
  vi.unstubAllGlobals();
});

it("configures and moves four independent children while reusing source data and limiting label renders", async () => {
  const fetch = serveClinGen();
  const browserStore = createBrowserStore({
    assembly: hg38,
    region: { chromosome: "chr17", start: 43000000, end: 43100000 },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [
      clinGenHaploModule,
      clinGenTriploModule,
      clinGenGeneDiseaseModule,
      clinGenCspecModule,
    ],
    ...createClinGenTrackSet(),
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  expect(document.querySelectorAll("[data-clingen-interval]")).toHaveLength(5);
  expect(trackStore.getState().getTrack("clingen-gene-disease")?.base.height).toBe(36);
  const requests = fetch.mock.calls.length;
  const labels = await probe.measure(() =>
    trackStore.getState().updateTrack("clingen-haplo", { config: { showLabels: false } }),
  );
  expect(labels.pick("PackedClinGen", "ClinGenIntervals")).toMatchInlineSnapshot(`
    {
      "ClinGenIntervals": 1,
      "PackedClinGen": 1,
    }
  `);
  expect(document.querySelector('[data-track-id="clingen-haplo"] [data-clingen-label]')).toBeNull();
  expect(
    document.querySelector('[data-track-id="clingen-triplo"] [data-clingen-label]'),
  ).not.toBeNull();
  await probe.measure(() => trackStore.getState().setTrackVisibility("clingen-triplo", false));
  expect(document.querySelector('[data-track-id="clingen-triplo"]')).toBeNull();
  expect(document.querySelectorAll("[data-clingen-interval]")).toHaveLength(4);
  await probe.measure(() => trackStore.getState().setTrackVisibility("clingen-triplo", true));
  expect(document.querySelectorAll("[data-clingen-interval]")).toHaveLength(5);
  expect(
    trackStore.getState().moveTrackItem({ kind: "track", id: "clingen-cspec" }, {}),
  ).toMatchObject({ ok: false, code: "INTERACTION_BLOCKED" });
  await probe.measure(() =>
    trackStore.getState().updateTrackSet("clingen", { allowTrackTransfer: true }),
  );
  await probe.measure(() =>
    trackStore.getState().moveTrackItem({ kind: "track", id: "clingen-cspec" }, {}),
  );
  expect(trackStore.getState().trackSets[0].trackIds).toEqual([
    "clingen-haplo",
    "clingen-triplo",
    "clingen-gene-disease",
  ]);
  expect(
    document.querySelector('[data-track-id="clingen-cspec"] [data-clingen-interval]'),
  ).not.toBeNull();
  expect(fetch).toHaveBeenCalledTimes(requests);
  await probe.measure(() => trackStore.getState().updateTrackSetDisplay("clingen", "dense"));
  expect(trackStore.getState().getTrack("clingen-cspec")?.base.display).toBe("pack");
  expect(document.querySelectorAll('[data-clingen-mode="dense"]')).toHaveLength(3);
  const displayRequests = fetch.mock.calls.length;
  await probe.measure(() =>
    trackStore.getState().updateTrack("clingen-haplo", {
      config: {
        url: "https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenHaplo.bb?revision=2",
      },
    }),
  );
  expect(fetch.mock.calls.length).toBeGreaterThan(displayRequests);
  expect(
    document
      .querySelector('[data-track-id="clingen-haplo"] [data-clingen-interval]')
      ?.getAttribute("fill"),
  ).toBe("rgb(255,0,0)");
});

it.each(["dense", "pack", "full"] as const)(
  "exports the four ClinGen tracks in %s mode",
  async (display) => {
    serveClinGen();
    const browserStore = createBrowserStore({
      assembly: hg38,
      region: { chromosome: "chr17", start: 43000000, end: 43100000 },
      trackWidth: 1000,
    });
    const trackStore = createTrackStore({
      modules: [
        clinGenHaploModule,
        clinGenTriploModule,
        clinGenGeneDiseaseModule,
        clinGenCspecModule,
      ],
      ...createClinGenTrackSet({ display }),
    });
    probe = await renderWithProbe(
      <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
    );
    expect(document.querySelectorAll("[data-clingen-interval]")).toHaveLength(5);
    const svg = document.querySelector<SVGSVGElement>("#browserSVG")!;
    await expect(await exportTrackSvg(svg)).toMatchFileSnapshot(
      `./__snapshots__/clingen.${display}.svg`,
    );
  },
);
