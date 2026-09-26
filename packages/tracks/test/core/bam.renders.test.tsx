// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { bamModule, type BamRecord } from "@weng-lab/genomebrowser-tracks/bam";

const records: BamRecord[] = [1100, 1120].map((start, index) => ({
  chromosome: "chr1",
  start,
  end: start + 100,
  readName: `read${index}`,
  flags: 0,
  strand: "+",
  mappingQuality: 60,
  sequence: "A".repeat(100),
  phredQualities: null,
  cigar: [{ op: "M", length: 100, sequenceOffset: 0, referenceOffset: 0 }],
  mate: null,
  templateLength: 0,
}));
vi.mock("@weng-lab/genomic-reader", () => ({
  createBamFile: () => ({ read: async () => records }),
}));

let probe: Probe | undefined;
afterEach(() => probe?.unmount());

it("budgets BAM viewport, display, and section changes through the stores", async () => {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 1500 },
    trackWidth: 600,
  });
  const trackStore = createTrackStore({
    modules: [bamModule],
    tracks: [
      bamModule.create({
        base: { id: "bam", title: "BAM", display: "pack" },
        config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
      }),
    ],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  // setRegion pans within loaded overscan, updating coverage's visible scale.
  const pan = await probe.measure(() =>
    browserStore.getState().setRegion({
      chromosome: "chr1",
      start: 1020,
      end: 1520,
    }),
  );
  // Necessary: one render for the new viewport and section layout/scale.
  // The two unchanged read glyphs bail out.
  expect(pan.pick("BamRenderer", "CoverageSection", "AlignmentSection", "AlignmentGlyph"))
    .toMatchInlineSnapshot(`
    {
      "AlignmentGlyph": 0,
      "AlignmentSection": 1,
      "BamRenderer": 1,
      "CoverageSection": 1,
    }
  `);

  // updateTrack switches the read layout while retaining coverage.
  const display = await probe.measure(() => {
    trackStore.getState().updateTrack("bam", { base: { display: "squish" } });
  });
  // Necessary: the new display mounts once, including both read glyphs.
  // Existing overhead: height synchronization renders the section parents a
  // second time, although their drawings are unchanged. Glyphs bail out.
  expect(display.pick("BamRenderer", "CoverageSection", "AlignmentSection", "AlignmentGlyph"))
    .toMatchInlineSnapshot(`
    {
      "AlignmentGlyph": 2,
      "AlignmentSection": 2,
      "BamRenderer": 2,
      "CoverageSection": 2,
    }
  `);

  // updateTrack hides coverage and synchronizes the resulting track height.
  const section = await probe.measure(() => {
    trackStore.getState().updateTrack("bam", { config: { coverage: { show: false } } });
  });
  // Necessary: both glyphs move up when coverage is hidden. Existing overhead:
  // height synchronization renders BamRenderer and AlignmentSection again.
  expect(section.pick("BamRenderer", "AlignmentSection", "AlignmentGlyph")).toMatchInlineSnapshot(`
    {
      "AlignmentGlyph": 2,
      "AlignmentSection": 2,
      "BamRenderer": 2,
    }
  `);
});
