// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { rulerModule } from "../../src/ruler";
import { dynseqModule } from "../../src/dynseq";
import { bamModule } from "../../src/bam";

const reads = vi.hoisted(() => ({ sequence: vi.fn() }));
vi.mock("@weng-lab/genomic-reader", async (original) => ({
  ...(await original<typeof import("@weng-lab/genomic-reader")>()),
  createTwoBitFile: () => ({ read: reads.sequence }),
  createBigWigFile: () => ({
    getZoomLevels: async () => [],
    read: async () => [{ chromosome: "chr1", start: 0, end: 10, kind: "value", value: 1 }],
  }),
  createBamFile: () => ({
    read: async () => [
      {
        chromosome: "chr1",
        start: 0,
        end: 10,
        readName: "read",
        flags: 0,
        strand: "+",
        mappingQuality: 60,
        sequence: "A".repeat(10),
        phredQualities: null,
        mate: null,
        templateLength: 0,
        cigar: [{ op: "M", length: 10, referenceOffset: 0, sequenceOffset: 0 }],
      },
    ],
  }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
it("switches ruler, BAM and dynseq together and reuses sequence through width-only changes", async () => {
  vi.useFakeTimers();
  reads.sequence.mockImplementation(async (region) => [
    { ...region, sequence: "A".repeat(region.end - region.start) },
  ]);
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 0, end: 101 },
    trackWidth: 1000,
  });
  const sequenceUrl = "https://example.test/reference.2bit";
  const trackStore = createTrackStore({
    modules: [rulerModule, bamModule, dynseqModule],
    tracks: [
      rulerModule.create({ base: { id: "ruler", title: "Ruler" }, config: { sequenceUrl } }),
      bamModule.create({
        base: { id: "bam", title: "Reads", display: "pack" },
        config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE", sequenceUrl },
      }),
      dynseqModule.create({
        base: { id: "dynseq", title: "Scores" },
        config: { url: "YOUR_URL_HERE", twoBitUrl: sequenceUrl },
      }),
    ],
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const letters = (visible: boolean) => {
    expect(!!container.querySelector('[aria-label="chr1:0 A"]')).toBe(visible);
    expect(!!container.querySelector('[data-bam-display] [data-cigar="M"] text')).toBe(visible);
    expect(
      [...container.querySelectorAll("g[transform]")].some(
        (g) => g.getAttribute("transform")?.includes("scale(") && g.querySelector("path"),
      ),
    ).toBe(visible);
  };
  try {
    await act(async () =>
      root.render(
        <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
      ),
    );
    letters(false);
    expect(reads.sequence).not.toHaveBeenCalled();
    await act(async () => {
      browserStore.getState().setRegion({ chromosome: "chr1", start: 0, end: 100 });
    });
    letters(true);
    expect(reads.sequence).toHaveBeenCalledTimes(3);
    for (const [width, visible] of [
      [700, true],
      [599, false],
      [700, false],
      [800, true],
    ] as const) {
      await act(async () => {
        browserStore.getState().setTrackWidth(width);
      });
      letters(visible);
      await act(async () => vi.advanceTimersByTimeAsync(200));
      letters(visible);
      expect(reads.sequence).toHaveBeenCalledTimes(3);
    }
    await act(async () => {
      browserStore.getState().setBasePairDetail({ maxVisibleBases: 99 });
    });
    letters(false);
    await act(async () => {
      browserStore.getState().setBasePairDetail({ maxVisibleBases: 100 });
    });
    letters(true);
    expect(reads.sequence).toHaveBeenCalledTimes(3);
    await act(async () => {
      trackStore.getState().updateTrack("dynseq", { base: { display: "dense" } });
      trackStore.getState().updateTrack("bam", { base: { display: "squish" } });
    });
    expect(!!container.querySelector('[aria-label="chr1:0 A"]')).toBe(true);
    expect(container.querySelector('[data-bam-display] [data-cigar="M"] text')).toBeNull();
    expect(
      [...container.querySelectorAll("g[transform]")].some(
        (g) => g.getAttribute("transform")?.includes("scale(") && g.querySelector("path"),
      ),
    ).toBe(false);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  }
});
