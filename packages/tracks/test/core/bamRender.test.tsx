// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  bamModule,
  type BamData,
  type BamDisplay,
  type BamRecord,
} from "@weng-lab/genomebrowser-tracks/bam";
import { mountTrack, type MountedTrack } from "../mountTrack";

function read(overrides: Partial<BamRecord> = {}): BamRecord {
  return {
    chromosome: "chr1",
    start: 10,
    end: 20,
    readName: "a",
    flags: 0,
    strand: "+",
    mappingQuality: 60,
    sequence: "AAAAAAAAAA",
    phredQualities: Array(10).fill(30),
    cigar: [{ op: "M", length: 10, sequenceOffset: 0, referenceOffset: 0 }],
    mate: null,
    templateLength: 0,
    ...overrides,
  };
}
// Alignment-focused tests hide the default coverage section.
const track = bamModule.create({
  base: { id: "bam", title: "Alignments" },
  config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE", coverage: { show: false } },
});
type BamConfig = typeof track.config;
const props = {
  config: track.config,
  width: 1500,
  region: { chromosome: "chr1", start: 0, end: 100 },
  visibleRegion: { chromosome: "chr1", start: 0, end: 100 },
};
type Interaction = {
  onClick?: (record: BamRecord) => void;
  onHover?: (record: BamRecord) => void;
  onLeave?: (record: BamRecord) => void;
};
/** Mounts the BAM track in a browser whose span and width decide base-pair detail. */
function mount(
  display: BamDisplay,
  data: BamData,
  overrides: Partial<typeof props> = {},
  interaction?: Interaction,
) {
  const { config, width, region, visibleRegion } = { ...props, ...overrides };
  return mountTrack({
    module: bamModule,
    track: { base: { ...track.base, display }, config },
    interaction,
    data,
    region,
    visibleRegion,
    width,
  });
}
async function markup(display: BamDisplay, data: BamData, overrides: Partial<typeof props> = {}) {
  return (await mount(display, data, overrides)).content;
}
/** The track height the browser stores and lays the track out with. */
const heightOf = (view: MountedTrack) => view.trackStore.getState().getTrack("bam")?.base.height;
/** Applies a config change the way settings do, through the browser's track store. */
const configure = (view: MountedTrack, config: BamConfig) =>
  view.settle(() => view.trackStore.getState().updateTrack("bam", { config }));
/** The text cells of the tooltip a hovered element shows, in reading order. */
async function hoverTooltip(view: MountedTrack, target: Element) {
  const text = await view.hover(target);
  const cells = (selector: string) =>
    [...(view.tooltip?.querySelectorAll(selector) ?? [])].map((node) => node.textContent ?? "");
  return {
    text,
    texts: cells("text"),
    labels: cells('text[x="0"]'),
    values: cells('text[x="84"]'),
  };
}
const letters = (element: Element, op = "M") =>
  [...element.querySelectorAll(`[data-bases="${op}"]`)].map((node) => node.textContent).join("");
const rowCount = (element: Element) =>
  new Set(
    [...element.querySelectorAll("[data-bam-row]")].map((node) =>
      node.getAttribute("data-bam-row"),
    ),
  ).size;
function junctionPoint(arc: Element, x?: number) {
  const curve = arc.querySelector('path[stroke]:not([stroke="transparent"])')!;
  const [x1, y1, controlX, controlY, x2, y2] = curve
    .getAttribute("d")!
    .match(/-?[\d.]+/g)!
    .map(Number);
  const t = x === undefined ? 0.5 : (x - x1) / (x2 - x1);
  return {
    clientX: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * controlX + t ** 2 * x2,
    clientY: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * controlY + t ** 2 * y2,
  };
}
// jsdom has no SVG geometry; place the junction group at the pointer's origin.
function stubJunctionCoordinates(group: SVGGElement) {
  group.getScreenCTM = () =>
    ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }) as DOMMatrix;
}
describe("BAM displays", () => {
  it("uses the visible span for the exclusive configurable zoom limit in every display", async () => {
    const data = { records: [read()], reference: [] };
    const region = { chromosome: "chr1", start: 0, end: 150000 };
    for (const display of bamModule.displays) {
      const view = await mount(display, data, { region, visibleRegion: { ...region, end: 50000 } });
      expect(view.content.querySelectorAll("[data-bam-read]")).toHaveLength(0);
      await view.setView({ visibleRegion: { ...region, end: 50001 } });
      expect(view.content.querySelectorAll("[data-bam-read]")).toHaveLength(0);
      await view.setView({ visibleRegion: { ...region, end: 49999 } });
      expect(view.content.querySelectorAll("[data-bam-read]")).toHaveLength(1);
      await configure(view, { ...props.config, maxWindow: 40000 });
      expect(view.content.querySelectorAll("[data-bam-read]")).toHaveLength(0);
    }
  });

  const records = [
    read(),
    read({ start: 15, end: 25, readName: "b", strand: "-", flags: 16 }),
    read({ start: 50, end: 60, readName: "c" }),
  ];
  it("draws dense in one row, packs squish/pack, and gives full reads separate rows", async () => {
    const data = { records, reference: [] };
    const view = await mount("full", data);
    // Switch displays as a user would, so each height is a change the browser stores.
    for (const [display, rows, height] of [
      ["full", 3, 42],
      ["pack", 2, 28],
      ["squish", 2, 14],
      ["dense", 1, 14],
    ] as const) {
      await view.settle(() => view.trackStore.getState().updateTrack("bam", { base: { display } }));
      expect(
        view.content.querySelector("[data-bam-display]")?.getAttribute("data-bam-display"),
      ).toBe(display);
      expect(rowCount(view.content)).toBe(rows);
      expect(heightOf(view)).toBe(height);
    }
    expect((await markup("squish", data)).querySelectorAll("text")).toHaveLength(0);
    expect((await markup("pack", data)).textContent).toContain("a");
  });
  it("uses blue/red strand outlines and darker aligned blocks", async () => {
    const element = await markup("pack", { records, reference: [] });
    expect(
      element.querySelector('[data-bam-read="a"] [data-cigar="M"]')?.getAttribute("fill"),
    ).toBe("#1f3d7a");
    expect(
      element.querySelector('[data-bam-read="a"] [data-cigar="M"]')?.getAttribute("stroke"),
    ).toBe("#3366cc");
    expect(
      element.querySelector('[data-bam-read="b"] [data-cigar="M"]')?.getAttribute("fill"),
    ).toBe("#7a1f1f");
    expect(
      element.querySelector('[data-bam-read="b"] [data-cigar="M"]')?.getAttribute("stroke"),
    ).toBe("#cc3333");
  });
  it("draws CIGAR gaps and insertions at reference offsets and compares bases after gaps", async () => {
    const record = read({
      start: 10,
      end: 22,
      sequence: "AACT",
      cigar: [
        { op: "M", length: 2, sequenceOffset: 0, referenceOffset: 0 },
        { op: "I", length: 1, sequenceOffset: 2, referenceOffset: 2 },
        { op: "N", length: 8, sequenceOffset: 3, referenceOffset: 2 },
        { op: "D", length: 1, sequenceOffset: 3, referenceOffset: 10 },
        { op: "M", length: 1, sequenceOffset: 3, referenceOffset: 11 },
      ],
    });
    const element = await markup("pack", {
      records: [record],
      reference: [{ chromosome: "chr1", start: 0, end: 100, sequence: "A".repeat(100) }],
    });
    expect(element.querySelector('[data-cigar="N"]')?.getAttribute("d")).toBe("M180 7H300");
    expect(element.querySelector('[data-cigar="N"]')?.getAttribute("stroke-dasharray")).toBe("3 2");
    expect(element.querySelector('[data-cigar="D"]')?.getAttribute("d")).toBe("M300 7H315");
    expect(element.querySelector('[data-cigar="I"]')).not.toBeNull();
    expect(element.querySelectorAll('[data-mismatch="true"]')).toHaveLength(1);
    expect(element.querySelector('[data-mismatch="true"] text')?.textContent).toBe("T");
    expect(element.querySelector('[data-mismatch="true"] rect')?.getAttribute("x")).toBe("315");
    expect(
      (await markup("pack", { records: [record], reference: [] })).querySelectorAll(
        '[data-mismatch="true"]',
      ),
    ).toHaveLength(0);
  });
  it("outlines the span of reads without CIGAR detail and labels it unavailable", async () => {
    const record = read({ start: 10, end: 30, cigar: [] });
    const view = await mount("pack", { records: [record], reference: [] });
    const outline = view.content.querySelector("[data-cigar-unavailable]");
    expect(outline?.getAttribute("x")).toBe("150");
    expect(outline?.getAttribute("width")).toBe("300");
    expect(outline?.getAttribute("fill")).toBe("none");
    expect(
      (await markup("pack", { records: [read()], reference: [] })).querySelector(
        "[data-cigar-unavailable]",
      ),
    ).toBeNull();
    const { texts } = await hoverTooltip(view, view.content.querySelector('[data-bam-read="a"]')!);
    expect(texts[texts.indexOf("CIGAR") + 1]).toBe("Unavailable");
  });
  it("uses CIGAR X without reference, preserves stored reverse sequence, and respects the shared detail decision", async () => {
    const record = read({
      strand: "-",
      sequence: "ACGTAAAAAA",
      cigar: [{ op: "X", length: 10, sequenceOffset: 0, referenceOffset: 0 }],
    });
    const element = await markup("full", { records: [record], reference: [] });
    expect(letters(element, "X")).toBe("ACGTAAAAAA");
    expect(element.querySelectorAll('[data-mismatch="true"]')).toHaveLength(10);
    // 101 visible bases exceed the browser's default 100-base detail limit.
    const zoomedOut = await markup(
      "full",
      { records: [record], reference: [] },
      { visibleRegion: { chromosome: "chr1", start: 0, end: 101 } },
    );
    expect(letters(zoomedOut, "X")).toBe("");
    expect(zoomedOut.querySelector('[data-cigar="X"]')?.getAttribute("fill")).toBe("#ef4444");
  });
  it("filters duplicates and unknown MAPQ locally and ignores other chromosomes", async () => {
    const data = {
      records: [
        read(),
        read({ flags: 1024 }),
        read({ mappingQuality: 255 }),
        read({ chromosome: "chr2" }),
      ],
      reference: [],
    };
    expect(
      (
        await markup("pack", data, {
          config: {
            ...track.config,
            filters: { includeDuplicates: false, minimumMappingQuality: 20 },
          },
        })
      ).querySelectorAll("[data-bam-read]"),
    ).toHaveLength(1);
  });
  it("sizes only visible rows, keeps overscan reads, and reserves label bounds when packing", async () => {
    const data = { records: [read(), read(), read({ start: 70, end: 80 })], reference: [] };
    const view = await mount("full", data);
    expect(heightOf(view)).toBe(42);
    await view.setView({ visibleRegion: { chromosome: "chr1", start: 60, end: 90 } });
    expect(view.content.querySelectorAll("[data-bam-read]")).toHaveLength(3);
    expect(heightOf(view)).toBe(14);
    const labels = {
      records: [read({ readName: "read_with_a_long_name" }), read({ start: 23, end: 33 })],
      reference: [],
    };
    expect(rowCount(await markup("squish", labels))).toBe(1);
    expect(rowCount(await markup("pack", labels))).toBe(2);
  });
  it("reserves space for a reference warning without hiding alignments", async () => {
    const element = await markup("squish", {
      records: [read()],
      reference: [],
      referenceError: "CORS",
    });
    expect(element.querySelector('[data-bam-row="0"]')?.getAttribute("transform")).toBe(
      "translate(0,14)",
    );
  });
  it("passes the complete alignment to click, hover, leave, and tooltip handlers", async () => {
    const interaction = { onClick: vi.fn(), onHover: vi.fn(), onLeave: vi.fn() };
    const record = read();
    // Core passes the hovered item and the read-only track to interaction callbacks.
    const bamTrack = expect.objectContaining({
      type: "bam",
      base: expect.objectContaining({ id: "bam" }),
    });
    const view = await mount("pack", { records: [record], reference: [] }, {}, interaction);
    const glyph = view.content.querySelector("[data-bam-read]")!;
    const tip = await view.hover(glyph);
    // A consumer tooltip receives the item as given, so every field of it is contract.
    expect(view.tooltipItem).toEqual(record);
    expect(interaction.onHover).toHaveBeenCalledWith(record, bamTrack);
    for (const text of ["a", "Locationchr1:11–20", "CIGAR10M", "SequenceAAAAAAAAAA"])
      expect(tip).toContain(text);
    await view.click(glyph);
    expect(interaction.onClick).toHaveBeenCalledWith(record, bamTrack);
    expect(await view.leave(glyph)).toBe("");
    expect(interaction.onLeave).toHaveBeenCalledWith(record, bamTrack);
  });
  it("wraps long tooltip values into aligned continuation rows", async () => {
    const sequence = "ACGT".repeat(20);
    const cigar = Array.from({ length: 20 }, (_, index) => ({
      op: "M" as const,
      length: 123,
      referenceOffset: index * 123,
      sequenceOffset: index * 123,
    }));
    const view = await mount("pack", { records: [read({ sequence, cigar })], reference: [] });
    const { labels, values } = await hoverTooltip(
      view,
      view.content.querySelector("[data-bam-read]")!,
    );
    expect(values.every((value) => value.length <= 32)).toBe(true);
    expect(values).toContain(sequence.slice(0, 32));
    expect(values).toContain(sequence.slice(64));
    expect(labels.filter((label) => label === "CIGAR")).toHaveLength(1);
    expect(labels.filter((label) => label === "Sequence")).toHaveLength(1);
    const cigarStart = values.indexOf("123M".repeat(8));
    expect(values.slice(cigarStart, cigarStart + 3).join("")).toBe("123M".repeat(20));
  });
  it("shows alignment metadata and distinguishes unavailable values in tooltips", async () => {
    const view = await mount("pack", {
      records: [
        read({
          flags: 1123,
          mappingQuality: 255,
          mate: { chromosome: "chr2", start: 123, strand: "-", unmapped: false },
          templateLength: -400,
          phredQualities: null,
        }),
      ],
      reference: [],
    });
    const { text } = await hoverTooltip(view, view.content.querySelector("[data-bam-read]")!);
    for (const value of [
      "chr1:11–20",
      "10M",
      "Unavailable",
      "duplicate",
      "first in pair",
      "chr2:124 (-)",
      "-400",
      "AAAAAAAAAA",
    ])
      expect(text).toContain(value);
  });
});

describe("BAM sections", () => {
  const defaults = bamModule.create({
    base: { id: "bam", title: "Alignments" },
    config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
  }).config;
  const spliced = read({
    start: 10,
    end: 40,
    cigar: [
      { op: "M", length: 5, sequenceOffset: 0, referenceOffset: 0 },
      { op: "N", length: 20, sequenceOffset: 5, referenceOffset: 5 },
      { op: "M", length: 5, sequenceOffset: 5, referenceOffset: 25 },
    ],
  });
  const data = { records: [spliced, { ...spliced, readName: "b" }], reference: [] };
  const withSections = (sections: {
    coverage?: boolean;
    junctions?: boolean;
    alignments?: boolean;
  }) => ({
    ...defaults,
    coverage: { ...defaults.coverage, show: sections.coverage ?? false },
    junctions: { ...defaults.junctions, show: sections.junctions ?? false },
    alignments: { ...defaults.alignments, show: sections.alignments ?? false },
  });
  const sectionTops = (element: Element) =>
    [...element.querySelectorAll("[data-bam-section]")].map((section) => [
      section.getAttribute("data-bam-section"),
      section.getAttribute("transform") ??
        section.querySelector("[data-bam-row]")?.getAttribute("transform"),
    ]);
  const junctionTip = (strand: "+" | "-", support: number) =>
    expect.stringMatching(
      new RegExp(
        `^Splice junction.*Strand${strand === "+" ? "\\+ \\(forward\\)" : "- \\(reverse\\)"}.*Support${support} alignments$`,
      ),
    );
  const withReverse = {
    ...data,
    records: [...data.records, { ...spliced, readName: "reverse", strand: "-" as const }],
  };

  it("defaults to coverage above alignments and stacks sections in a fixed order", async () => {
    const view = await mount("pack", data, { config: defaults });
    expect(sectionTops(view.content)).toEqual([
      ["coverage", "translate(0,0)"],
      ["alignments", "translate(0,64)"],
    ]);
    expect(heightOf(view)).toBe(60 + 4 + 2 * 14);
    const all = withSections({ coverage: true, junctions: true, alignments: true });
    expect(sectionTops(await markup("full", data, { config: all }))).toEqual([
      ["coverage", "translate(0,0)"],
      ["junctions", "translate(0,64)"],
      ["alignments", "translate(0,168)"],
    ]);
  });
  it("gives hidden sections no space and keeps the read layout when alignments are hidden", async () => {
    const view = await mount("squish", data, { config: withSections({ coverage: true }) });
    for (const [sections, height] of [
      [{ coverage: true }, 60],
      [{ junctions: true }, 100],
      [{ coverage: true, junctions: true }, 164],
      [{ alignments: true }, 14],
    ] as const) {
      await configure(view, withSections(sections));
      expect(
        view.content.querySelector("[data-bam-display]")?.getAttribute("data-bam-display"),
      ).toBe("squish");
      expect(heightOf(view)).toBe(height);
    }
  });
  it("draws one arc per junction with its support and skips aggregates while zoomed out", async () => {
    const config = withSections({ coverage: true, junctions: true });
    const junction = (await markup("pack", data, { config })).querySelector("[data-junction]");
    expect(junction?.getAttribute("data-junction")).toBe("15-35");
    expect(junction?.getAttribute("data-support")).toBe("2");
    expect(junction?.textContent).toBe("2");
    const minimumSupport = { ...config, junctions: { ...config.junctions, minimumSupport: 3 } };
    expect(
      (await markup("pack", data, { config: minimumSupport })).querySelector("[data-junction]"),
    ).toBe(null);
    const zoomedOut = await markup("pack", data, {
      config,
      visibleRegion: { chromosome: "chr1", start: 0, end: 60_000 },
    });
    expect(zoomedOut.querySelector("[data-bam-section]")).toBeNull();
  });
  it("scales coverage to the visible region, ignoring overscan", async () => {
    const deep = Array.from({ length: 5 }, (_, index) =>
      read({ start: 80, end: 90, readName: `deep${index}`, strand: "-" }),
    );
    const config = withSections({ coverage: true });
    const scaleMax = (element: Element) =>
      element
        .querySelector('[data-bam-section="coverage"]')
        ?.getAttribute("data-scale-forward-max");
    const view = await mount(
      "pack",
      { records: [read(), ...deep], reference: [] },
      { config, visibleRegion: { chromosome: "chr1", start: 0, end: 50 } },
    );
    expect(scaleMax(view.content)).toBe("1");
    await view.setView({ visibleRegion: { chromosome: "chr1", start: 0, end: 100 } });
    expect(scaleMax(view.content)).toBe("5");
    const fixed = {
      ...config,
      coverage: {
        ...config.coverage,
        scale: { mode: "fixed" as const, forwardMax: 3, reverseMax: 3 },
      },
    };
    expect(
      scaleMax(await markup("pack", { records: deep, reference: [] }, { config: fixed })),
    ).toBe("3");
  });
  it.each(["bars", "line"] as const)(
    "draws %s coverage on a symmetric strand scale and clips both sides equally",
    async (graph) => {
      const config = withSections({ coverage: true });
      config.coverage.graph = graph;
      const mixed = {
        records: [read(), read({ readName: "b" }), read({ readName: "reverse", strand: "-" })],
        reference: [],
      };
      const depthYs = (element: Element, strand: "+" | "-") => {
        const path = element
          .querySelector(`[data-bam-section="coverage"] path[data-strand="${strand}"]`)!
          .getAttribute("d")!;
        return graph === "bars"
          ? [...path.matchAll(/V ([\d.]+)/g)].map((match) => Number(match[1]))
          : [...path.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]));
      };
      const view = await mount("pack", mixed, { config, width: 100 });
      const coverage = view.content.querySelector('[data-bam-section="coverage"]')!;
      expect(coverage.getAttribute("data-scale-forward-max")).toBe("2");
      expect(coverage.querySelector("line")?.getAttribute("y1")).toBe("30");
      expect(Math.min(...depthYs(view.content, "+"))).toBe(0);
      expect(Math.max(...depthYs(view.content, "-"))).toBe(45);
      await configure(view, {
        ...config,
        coverage: { ...config.coverage, scale: { mode: "fixed", forwardMax: 1, reverseMax: 1 } },
      });
      expect(Math.min(...depthYs(view.content, "+"))).toBe(0);
      expect(Math.max(...depthYs(view.content, "-"))).toBe(60);
      await configure(view, config);
      await view.setView({ data: { records: [], reference: [] } });
      expect(new Set(depthYs(view.content, "+"))).toEqual(new Set([30]));
      expect(new Set(depthYs(view.content, "-"))).toEqual(new Set([30]));
    },
  );
  it.each(["bars", "line"] as const)(
    "marks only overflowing %s coverage bins at both strand limits",
    async (graph) => {
      const config = withSections({ coverage: true });
      const mixed = {
        records: [
          read(),
          read({ readName: "forward2" }),
          read({ readName: "reverse1", strand: "-" }),
          read({ readName: "reverse2", strand: "-" }),
          read({ readName: "atLimit", start: 30, end: 40 }),
        ],
        reference: [],
      };
      const fixed = {
        ...config,
        coverage: {
          ...config.coverage,
          graph,
          height: 80,
          scale: { mode: "fixed" as const, forwardMax: 1, reverseMax: 1 },
        },
      };
      const view = await mount("pack", mixed, { config: fixed, width: 100 });
      const result = view.content;
      expect(result.querySelectorAll('[data-bam-clamp="true"]')).toHaveLength(2);
      for (const [strand, edge, inward] of [
        ["+", 0, 2],
        ["-", 80, 78],
      ] as const) {
        const indicator = result.querySelector(
          `path[data-bam-clamp="true"][data-strand="${strand}"]`,
        )!;
        expect(indicator.getAttribute("stroke")).toBe("#ff0000");
        const ticks = [
          ...indicator.getAttribute("d")!.matchAll(/M\s*([\d.]+)\s+([\d.]+)\s*l\s*0\s+(-?[\d.]+)/g),
        ].map((match) => [Number(match[1]), Number(match[2]), Number(match[2]) + Number(match[3])]);
        expect(ticks).toEqual(
          Array.from({ length: 10 }, (_, index) => [10.5 + index, edge, inward]),
        );
      }
      await configure(view, config);
      expect(view.content.querySelector('[data-bam-clamp="true"]')).toBeNull();
      await configure(view, {
        ...fixed,
        coverage: { ...fixed.coverage, showClampIndicators: false },
      });
      expect(view.content.querySelector('[data-bam-clamp="true"]')).toBeNull();
      await configure(view, {
        ...fixed,
        coverage: { ...fixed.coverage, clampIndicatorColor: "#123456" },
      });
      const customIndicators = view.content.querySelectorAll('[data-bam-clamp="true"]');
      expect([...customIndicators].map((indicator) => indicator.getAttribute("stroke"))).toEqual([
        "#123456",
        "#123456",
      ]);
    },
  );
  it.each(["bars", "line"] as const)(
    "scales %s coverage independently by strand",
    async (graph) => {
      const config = withSections({ coverage: true });
      const mixed = {
        records: [
          read(),
          read({ readName: "forward2" }),
          read({ readName: "reverse1", strand: "-" }),
          read({ readName: "reverse2", strand: "-" }),
        ],
        reference: [],
      };
      const withScale = (reverseMax?: number) => ({
        ...config,
        coverage: {
          ...config.coverage,
          graph,
          scale: {
            mode: "fixed" as const,
            forwardMax: 1,
            ...(reverseMax === undefined ? {} : { reverseMax }),
          },
        },
      });
      const view = await mount("pack", mixed, { width: 100, config: withScale(4) });
      const coverage = view.content.querySelector('[data-bam-section="coverage"]')!;
      expect(coverage.getAttribute("data-scale-forward-max")).toBe("1");
      expect(coverage.getAttribute("data-scale-reverse-max")).toBe("4");
      const depths = (strand: "+" | "-") => {
        const path = coverage
          .querySelector(`path[data-strand="${strand}"]:not([data-bam-clamp])`)!
          .getAttribute("d")!;
        return graph === "bars"
          ? [...path.matchAll(/V ([\d.]+)/g)].map((match) => Number(match[1]))
          : [...path.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]));
      };
      expect(Math.min(...depths("+"))).toBe(0);
      expect(Math.max(...depths("-"))).toBe(45);
      expect(coverage.querySelectorAll('[data-bam-clamp="true"]')).toHaveLength(1);
      expect(coverage.querySelector('[data-bam-clamp="true"]')?.getAttribute("data-strand")).toBe(
        "+",
      );
      await configure(view, withScale());
      const automaticReverse = view.content.querySelector('[data-bam-section="coverage"]')!;
      expect(automaticReverse.getAttribute("data-scale-forward-max")).toBe("1");
      expect(automaticReverse.getAttribute("data-scale-reverse-max")).toBe("2");
      expect(automaticReverse.querySelector('[data-bam-clamp="true"][data-strand="-"]')).toBeNull();
    },
  );
  it("uses the selected coverage summary when deciding whether a bin is clamped", async () => {
    const config = withSections({ coverage: true });
    const summarized = {
      records: [
        read({
          start: 10,
          end: 15,
          cigar: [{ op: "M" as const, length: 5, sequenceOffset: 0, referenceOffset: 0 }],
        }),
        read({
          readName: "peak",
          start: 10,
          end: 15,
          cigar: [{ op: "M" as const, length: 5, sequenceOffset: 0, referenceOffset: 0 }],
        }),
      ],
      reference: [],
    };
    const summary = (aggregation: "mean" | "max") => ({
      ...config,
      coverage: {
        ...config.coverage,
        aggregation,
        scale: { mode: "fixed" as const, forwardMax: 1, reverseMax: 1 },
      },
    });
    // The [10,20) bin has mean depth 1 and maximum depth 2.
    const view = await mount("pack", summarized, { width: 10, config: summary("mean") });
    expect(view.content.querySelector('[data-bam-clamp="true"]')).toBeNull();
    await configure(view, summary("max"));
    const indicator = view.content.querySelector('[data-bam-clamp="true"]')!;
    expect(indicator.getAttribute("data-strand")).toBe("+");
    expect(
      indicator
        .getAttribute("d")!
        .match(/-?[\d.]+/g)!
        .map(Number),
    ).toEqual([1.5, 0, 0, 2]);
  });
  it("shares strand colors across sections and keeps coincident junction support separate", async () => {
    const config = {
      ...withSections({ coverage: true, junctions: true, alignments: true }),
      strandColors: { forward: "#228844", reverse: "#8844cc" },
    };
    const view = await mount("pack", withReverse, { config });
    const element = view.content;
    for (const [strand, color, support, name] of [
      ["+", "#228844", "2", "a"],
      ["-", "#8844cc", "1", "reverse"],
    ]) {
      expect(
        element
          .querySelector(`[data-bam-section="coverage"] path[data-strand="${strand}"]`)
          ?.getAttribute("fill"),
      ).toBe(color);
      const junction = element.querySelector(`[data-junction="15-35"][data-strand="${strand}"]`)!;
      expect(junction.getAttribute("data-support")).toBe(support);
      expect(junction.querySelector("text")?.textContent).toBe(support);
      expect(junction.querySelector("path")?.getAttribute("stroke")).toBe(color);
      expect(
        element.querySelector(`[data-bam-read="${name}"] [data-cigar="M"]`)?.getAttribute("stroke"),
      ).toBe(color);
    }
    const arcs = [...element.querySelectorAll('[data-junction="15-35"] path:first-child')].map(
      (path) => path.getAttribute("d"),
    );
    expect(new Set(arcs).size).toBe(2);
    const labels = [...element.querySelectorAll('[data-junction="15-35"] text')].map(
      (label) => `${label.getAttribute("x")},${label.getAttribute("y")}`,
    );
    expect(new Set(labels).size).toBe(2);
    await configure(view, { ...config, junctions: { ...config.junctions, minimumSupport: 2 } });
    expect(view.content.querySelectorAll("[data-junction]")).toHaveLength(1);
    expect(view.content.querySelector("[data-junction]")?.getAttribute("data-strand")).toBe("+");
  });
  it("clears a hovered junction when its strand falls below minimum support", async () => {
    const config = withSections({ junctions: true });
    const withMinimum = (minimumSupport: number) => ({
      ...config,
      junctions: { ...config.junctions, minimumSupport },
    });
    const view = await mount("pack", withReverse, { config: withMinimum(1) });
    const group = view.content.querySelector<SVGGElement>("[data-junction-group]")!;
    stubJunctionCoordinates(group);
    const reverse = group.querySelector('[data-strand="-"]')!;
    const reverseColor = reverse.querySelector("path")!.getAttribute("stroke");
    expect(
      await view.move(
        reverse.querySelector('path[pointer-events="stroke"]')!,
        junctionPoint(reverse),
      ),
    ).toEqual(junctionTip("-", 1));
    expect(reverse.querySelector("path")!.getAttribute("stroke")).not.toBe(reverseColor);

    // The forward arc keeps the same group mounted while the pointer stays still.
    await configure(view, withMinimum(2));
    expect(view.content.querySelector("[data-junction-group]")).toBe(group);
    expect(group.querySelector('[data-strand="-"]')).toBeNull();
    expect(group.querySelector('[data-strand="+"]')).not.toBeNull();
    expect(view.tooltip).toBeNull();

    // Restoring the strand must not restore its old hover selection.
    await configure(view, withMinimum(1));
    expect(group.querySelector('[data-strand="-"] path')!.getAttribute("stroke")).toBe(
      reverseColor,
    );
    expect(view.tooltip).toBeNull();

    await configure(view, withMinimum(2));
    const forward = group.querySelector('[data-strand="+"]')!;
    expect(
      await view.move(
        forward.querySelector('path[pointer-events="stroke"]')!,
        junctionPoint(forward),
      ),
    ).toEqual(junctionTip("+", 2));
  });
  it.each([10, 23, 100])(
    "selects the nearer coincident junction at height %i regardless of the hit target",
    async (height) => {
      const config = withSections({ junctions: true });
      config.junctions.height = height;
      const view = await mount("pack", withReverse, { config });
      const group = view.content.querySelector<SVGGElement>("[data-junction-group]")!;
      stubJunctionCoordinates(group);
      for (const strand of ["+", "-"] as const) {
        const arc = group.querySelector(`[data-strand="${strand}"]`)!;
        // Either overlapping hit path can receive the event. Its strand must
        // not override the curve nearest the actual pointer coordinates.
        const other = group.querySelector(
          `[data-strand="${strand === "+" ? "-" : "+"}"] path[pointer-events="stroke"]`,
        )!;
        expect(await view.move(other, junctionPoint(arc))).toEqual(
          junctionTip(strand, strand === "+" ? 2 : 1),
        );
      }
      // Rebuilding the arc geometry on a palette update must retain the
      // stationary pointer's chosen strand highlight.
      await configure(view, {
        ...config,
        strandColors: { ...config.strandColors, reverse: "#3366cc" },
      });
      const reversePath = group.querySelector('[data-strand="-"] path')!;
      expect(reversePath.getAttribute("stroke")).toBe("#1f3d7a");
      expect(await view.leave(group)).toBe("");
    },
  );
  it("selects visible curves whose peaks are offscreen and prefers forward at the shared endpoint", async () => {
    const long = read({
      start: 0,
      end: 10010,
      cigar: [
        { op: "M", length: 5, sequenceOffset: 0, referenceOffset: 0 },
        { op: "N", length: 10000, sequenceOffset: 5, referenceOffset: 5 },
        { op: "M", length: 5, sequenceOffset: 5, referenceOffset: 10005 },
      ],
    });
    const region = { chromosome: "chr1", start: 5, end: 105 };
    const view = await mount(
      "pack",
      { records: [long, { ...long, readName: "reverse", strand: "-" }], reference: [] },
      { region, visibleRegion: region, width: 1000, config: withSections({ junctions: true }) },
    );
    const group = view.content.querySelector<SVGGElement>("[data-junction-group]")!;
    stubJunctionCoordinates(group);
    const forward = group.querySelector('[data-strand="+"]')!;
    const reverse = group.querySelector('[data-strand="-"]')!;
    const forwardPoint = junctionPoint(forward, 500);
    const reversePoint = junctionPoint(reverse, 500);
    // Their peaks are far outside the viewport; at the visible midpoint
    // these curves are less than one pixel apart and their hit areas overlap.
    expect(Math.abs(forwardPoint.clientY - reversePoint.clientY)).toBeLessThan(1);
    for (const [arc, point, strand] of [
      [reverse, forwardPoint, "+"],
      [forward, reversePoint, "-"],
      [reverse, { clientX: 500, clientY: (forwardPoint.clientY + reversePoint.clientY) / 2 }, "+"],
      [reverse, { clientX: 0, clientY: 99 }, "+"],
    ] as const) {
      expect(await view.move(arc.querySelector('path[pointer-events="stroke"]')!, point)).toEqual(
        junctionTip(strand, 1),
      );
    }
  });
  it("keeps packed reads on their rows while panning and when new data loads", async () => {
    const config = withSections({ alignments: true });
    const first = {
      records: [
        read({ readName: "left", start: 10, end: 60 }),
        read({ readName: "long", start: 20, end: 280 }),
        read({ readName: "right", start: 200, end: 250 }),
      ],
      reference: [],
    };
    const view = await mount("pack", first, {
      config,
      region: { chromosome: "chr1", start: 0, end: 300 },
      visibleRegion: { chromosome: "chr1", start: 0, end: 100 },
    });
    const rowOf = () =>
      Object.fromEntries(
        [...view.content.querySelectorAll("[data-bam-read]")].map((node) => [
          node.getAttribute("data-bam-read"),
          node.getAttribute("data-bam-row"),
        ]),
      );
    const before = rowOf();
    await view.setView({ visibleRegion: { chromosome: "chr1", start: 180, end: 280 } });
    expect(rowOf()).toEqual(before);
    // New data drops "left" and adds a read that would otherwise take its row.
    await view.setView({
      data: {
        records: [
          read({ readName: "long", start: 20, end: 280 }),
          read({ readName: "right", start: 200, end: 250 }),
          read({ readName: "new", start: 5, end: 15 }),
        ],
        reference: [],
      },
    });
    expect(rowOf()).toMatchObject({ long: before.long, right: before.right });
  });
  it.each(["mean", "max"] as const)(
    "excludes partial off-screen bins from %s autoscaling",
    async (aggregation) => {
      const config = withSections({ coverage: true });
      config.coverage.aggregation = aggregation;
      const records = [
        read({
          start: 0,
          end: 100,
          cigar: [{ op: "M", length: 100, sequenceOffset: 0, referenceOffset: 0 }],
        }),
        ...Array.from({ length: 9 }, (_, index) =>
          read({
            readName: `peak${index}`,
            start: 5,
            end: 15,
          }),
        ),
      ];
      const scaleMax = () =>
        view.content
          .querySelector('[data-bam-section="coverage"]')
          ?.getAttribute("data-scale-forward-max");
      const visible = (start: number) => ({ chromosome: "chr1", start, end: start + 70 });
      // The render bin [10,20) straddles the viewport edge at 15. Its hidden peak
      // must not raise the scale, even though overscan remains ready for panning.
      const view = await mount(
        "pack",
        { records, reference: [] },
        { config, width: 10, visibleRegion: visible(15) },
      );
      expect(scaleMax()).toBe("1");
      await view.setView({ visibleRegion: visible(5) });
      expect(scaleMax()).toBe("10");
      await view.setView({ visibleRegion: visible(15) });
      await configure(view, {
        ...config,
        coverage: { ...config.coverage, scale: { mode: "fixed", forwardMax: 3, reverseMax: 3 } },
      });
      expect(scaleMax()).toBe("3");
      expect(heightOf(view)).toBe(60);
    },
  );
  it("repacks colliding labels after resize and respects a reduced row limit", async () => {
    const config = withSections({ alignments: true });
    const view = await mount(
      "pack",
      {
        records: [
          read({ readName: "long_read_name", start: 10, end: 20 }),
          read({ readName: "next_read", start: 40, end: 50 }),
        ],
        reference: [],
      },
      { config, width: 1500 },
    );
    expect(rowCount(view.content)).toBe(1);
    // Keep data and config identities stable while labels outgrow the gap.
    await view.setView({ width: 200 });
    expect(rowCount(view.content)).toBe(2);
    expect(view.content.querySelectorAll("[data-bam-read]")).toHaveLength(2);
    await configure(view, { ...config, alignments: { ...config.alignments, maxRows: 1 } });
    expect(rowCount(view.content)).toBe(1);
    expect(view.content.querySelectorAll("[data-bam-read]")).toHaveLength(1);
  });
  it("draws at most maxRows alignment rows and discloses the rest while counting them", async () => {
    const stacked = Array.from({ length: 5 }, (_, index) => read({ readName: `r${index}` }));
    const config = {
      ...withSections({ coverage: true, alignments: true }),
      alignments: { ...defaults.alignments, maxRows: 2 },
    };
    for (const display of ["pack", "full"] as const) {
      const view = await mount(display, { records: stacked, reference: [] }, { config });
      expect(rowCount(view.content)).toBe(2);
      expect(heightOf(view)).toBe(60 + 4 + 2 * 14 + 14);
      expect(
        view.content
          .querySelector('[data-bam-section="coverage"]')
          ?.getAttribute("data-scale-forward-max"),
      ).toBe("5");
    }
  });
  it("sends coverage bins and junctions to the tooltip without calling read interactions", async () => {
    const interaction = { onClick: vi.fn(), onHover: vi.fn(), onLeave: vi.fn() };
    const view = await mount(
      "pack",
      withReverse,
      { config: withSections({ coverage: true, junctions: true }) },
      interaction,
    );
    const overlays = [
      ...view.content.querySelectorAll<SVGRectElement>(
        '[data-bam-section="coverage"] rect[pointer-events="all"]',
      ),
    ];
    for (const overlay of overlays)
      overlay.getBoundingClientRect = () => ({ left: 0, width: 1500 }) as DOMRect;
    const [forwardCoverage, reverseCoverage] = await (async () => {
      const texts = [];
      for (const overlay of overlays)
        texts.push(await view.move(overlay, { clientX: 160, clientY: 0 }));
      return texts;
    })();
    expect(forwardCoverage).toBe("CoverageLocationchr1:11–11Strand+ (forward)Depth2 alignments");
    expect(reverseCoverage).toContain("Strand- (reverse)Depth1 alignments");
    const group = view.content.querySelector<SVGGElement>("[data-junction-group]")!;
    // The junction section starts below the coverage section. The inverse
    // screen transform converts pointer coordinates into its local space.
    group.getScreenCTM = () =>
      ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: -64 }) }) as DOMMatrix;
    for (const [strand, support] of [
      ["+", 2],
      ["-", 1],
    ] as const) {
      const arc = group.querySelector(`[data-strand="${strand}"]`)!;
      const point = junctionPoint(arc);
      expect(
        await view.move(arc.querySelector('path[pointer-events="stroke"]')!, {
          clientX: point.clientX,
          clientY: point.clientY + 64,
        }),
      ).toEqual(junctionTip(strand, support));
    }
    expect(interaction.onHover).not.toHaveBeenCalled();
  });
  it("labels per-base depth separately from summarized coverage in tooltips", async () => {
    const config = withSections({ coverage: true, junctions: true });
    const view = await mount("pack", withReverse, { config });
    const coverageAt = async (strand: "+" | "-", clientX: number) => {
      const overlay = view.content.querySelectorAll<SVGRectElement>(
        '[data-bam-section="coverage"] rect[pointer-events="all"]',
      )[strand === "+" ? 0 : 1];
      overlay.getBoundingClientRect = () => ({ left: 0, width: 1500 }) as DOMRect;
      return view.move(overlay, { clientX, clientY: 0 });
    };
    // One-base bins at 15 pixels per base.
    const perBase = await coverageAt("+", 160);
    expect(perBase).toContain("Depth");
    expect(perBase).toContain("+ (forward)");
    expect(perBase).not.toContain("Mean depth");
    expect(await coverageAt("-", 160)).toContain("- (reverse)");
    const group = view.content.querySelector<SVGGElement>("[data-junction-group]")!;
    group.getScreenCTM = () =>
      ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: -64 }) }) as DOMMatrix;
    for (const [strand, text] of [
      ["-", "- (reverse)"],
      ["+", "2 alignments"],
    ] as const) {
      const arc = group.querySelector(`[data-strand="${strand}"]`)!;
      const point = junctionPoint(arc);
      expect(
        await view.move(arc.querySelector('path[pointer-events="stroke"]')!, {
          clientX: point.clientX,
          clientY: point.clientY + 64,
        }),
      ).toContain(text);
    }
    // Twenty-base bins: [0,20) holds 20 bases of depth 1 and 5 of depth 2, a mean of 1.25.
    const summarized = await mount(
      "pack",
      {
        records: [
          read({
            start: 0,
            end: 20,
            cigar: [{ op: "M", length: 20, sequenceOffset: 0, referenceOffset: 0 }],
          }),
          read({
            readName: "short",
            start: 5,
            end: 10,
            cigar: [{ op: "M", length: 5, sequenceOffset: 0, referenceOffset: 0 }],
          }),
        ],
        reference: [],
      },
      { config: withSections({ coverage: true }), width: 5 },
    );
    const overlay = summarized.content.querySelector<SVGRectElement>(
      '[data-bam-section="coverage"] rect[pointer-events="all"]',
    )!;
    overlay.getBoundingClientRect = () => ({ left: 0, width: 5 }) as DOMRect;
    const summary = await summarized.move(overlay, { clientX: 0.5, clientY: 0 });
    expect(summary).toContain("Coverage across 20 bases");
    expect(summary).toContain("Mean depth");
    expect(summary).toContain("1.25");
  });
});
