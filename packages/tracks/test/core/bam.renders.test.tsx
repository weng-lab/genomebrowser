// @vitest-environment jsdom

import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { GenomeBrowser, createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { bamModule, type BamRecord } from "@weng-lab/genomebrowser-tracks/bam";

const records: BamRecord[] = [1100, 1120].map((start, index) => ({
  chromosome: "chr1",
  start,
  end: start + 100,
  readName: `read${index}`,
  flags: index === 0 ? 0 : 16,
  strand: index === 0 ? "+" : "-",
  mappingQuality: 60,
  sequence: "A".repeat(100),
  phredQualities: null,
  cigar: [
    { op: "M", length: 30, sequenceOffset: 0, referenceOffset: 0 },
    { op: "N", length: 40, sequenceOffset: 30, referenceOffset: 30 },
    { op: "M", length: 30, sequenceOffset: 30, referenceOffset: 70 },
  ],
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
  // Mount both aggregate sections before measuring a palette-only update.
  await probe.measure(() => {
    trackStore
      .getState()
      .updateTrack("bam", { config: { coverage: { show: true }, junctions: { show: true } } });
  });
  // updateTrack changes the shared strand palette. Every visible section and
  // both read glyphs must redraw once to show the new colors.
  const palette = await probe.measure(() => {
    trackStore
      .getState()
      .updateTrack("bam", { config: { strandColors: { forward: "#228844", reverse: "#8844cc" } } });
  });
  expect(
    palette.pick(
      "BamRenderer",
      "CoverageSection",
      "JunctionSection",
      "JunctionArcGroup",
      "JunctionArcShape",
      "AlignmentSection",
      "AlignmentGlyph",
    ),
  ).toMatchInlineSnapshot(`
    {
      "AlignmentGlyph": 2,
      "AlignmentSection": 1,
      "BamRenderer": 1,
      "CoverageSection": 1,
      "JunctionArcGroup": 2,
      "JunctionArcShape": 2,
      "JunctionSection": 1,
    }
  `);

  // updateTrack fixes the coverage scale and changes clamp visibility. Coverage
  // must redraw; unchanged alignment glyphs still bail out. Section parents
  // currently redraw once when any track config changes.
  const coverageLimits = await probe.measure(() => {
    trackStore.getState().updateTrack("bam", {
      config: {
        coverage: {
          scale: { mode: "fixed", forwardMax: 0.5, reverseMax: 0.5 },
          showClampIndicators: false,
        },
      },
    });
  });
  expect(
    coverageLimits.pick("BamRenderer", "CoverageSection", "AlignmentSection", "AlignmentGlyph"),
  ).toMatchInlineSnapshot(`
    {
      "AlignmentGlyph": 0,
      "AlignmentSection": 1,
      "BamRenderer": 1,
      "CoverageSection": 1,
    }
  `);

  // Hover changes only the chosen junction group's highlight and tooltip.
  // Pointer movement along the same curve should not redraw any BAM section.
  const svg = document.querySelector<SVGSVGElement>("#browserSVG")!;
  const svgPoint = { x: 0, y: 0, matrixTransform: () => ({ x: svgPoint.x, y: svgPoint.y }) };
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => matrix };
  Object.assign(svg, { createSVGPoint: () => svgPoint, getScreenCTM: () => matrix });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 120, height: 30 }),
  });
  onTestFinished(() => {
    Reflect.deleteProperty(SVGElement.prototype, "getBBox");
  });
  const group = document.querySelector<SVGGElement>("[data-junction-group]")!;
  group.getScreenCTM = () =>
    ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }) as DOMMatrix;
  const target = group.querySelector('path[pointer-events="stroke"]')!;
  const [x1, y1, controlX, controlY, x2, y2] = target
    .getAttribute("d")!
    .match(/-?[\d.]+/g)!
    .map(Number);
  const point = (t: number) => ({
    clientX: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * controlX + t ** 2 * x2,
    clientY: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * controlY + t ** 2 * y2,
  });
  const names = ["BamRenderer", "JunctionSection", "JunctionArcGroup", "JunctionArcShape"];
  const hover = await probe.measure(async () => {
    target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, ...point(0.5) }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  expect(hover.pick(...names)).toMatchInlineSnapshot(`
    {
      "BamRenderer": 0,
      "JunctionArcGroup": 1,
      "JunctionArcShape": 1,
      "JunctionSection": 0,
    }
  `);
  const move = await probe.measure(() =>
    target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, ...point(0.6) })),
  );
  expect(move.pick(...names)).toMatchInlineSnapshot(`
    {
      "BamRenderer": 0,
      "JunctionArcGroup": 0,
      "JunctionArcShape": 0,
      "JunctionSection": 0,
    }
  `);
  const leave = await probe.measure(() =>
    group.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })),
  );
  expect(leave.pick(...names)).toMatchInlineSnapshot(`
    {
      "BamRenderer": 0,
      "JunctionArcGroup": 1,
      "JunctionArcShape": 1,
      "JunctionSection": 0,
    }
  `);
});
