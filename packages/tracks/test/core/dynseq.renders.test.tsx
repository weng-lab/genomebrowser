// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { dynseqModule } from "../../src/dynseq";

vi.mock("@weng-lab/genomic-reader", () => ({
  createBigWigFile: () => ({
    getZoomLevels: async () => [],
    read: async (region: { chromosome: string; start: number; end: number }) => [
      { ...region, kind: "value", value: 1 },
    ],
  }),
  createTwoBitFile: () => ({
    read: async (region: { chromosome: string; start: number; end: number }) => [
      { ...region, sequence: "A".repeat(region.end - region.start) },
    ],
  }),
}));

let probe: Probe | undefined;
afterEach(() => probe?.unmount());

it("budgets a zoom from signal to sequence through the browser store", async () => {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 0, end: 1000 },
    trackWidth: 600,
  });
  const trackStore = createTrackStore({
    modules: [dynseqModule],
    tracks: [
      dynseqModule.create({
        base: { id: "dynseq", title: "Scores" },
        config: { url: "YOUR_URL_HERE", twoBitUrl: "YOUR_URL_HERE" },
      }),
    ],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  // setRegion changes the scale, then completes the fetch for the new region.
  const report = await probe.measure(() =>
    browserStore.getState().setRegion({
      chromosome: "chr1",
      start: 100,
      end: 120,
    }),
  );
  // Necessary: FullDynseq mounts once with the fetched close-up data. TrackContent
  // commits the region change, loading state, and completed data. Counts match
  // the original renderer before the BigWig refactor.
  expect(report.pick("FullDynseq", "TrackContent")).toMatchInlineSnapshot(`
    {
      "FullDynseq": 1,
      "TrackContent": 3,
    }
  `);
});
