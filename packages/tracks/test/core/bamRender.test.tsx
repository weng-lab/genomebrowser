// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bamModule, type BamRecord, type BamData } from "@weng-lab/genomebrowser-tracks/bam";
import { BamTooltip } from "../../src/bam/tooltip";
import { TestBrowser } from "../testBrowser";

const hooks = vi.hoisted(() => ({
  click: vi.fn(),
  hover: vi.fn(),
  leave: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  height: vi.fn((_id: string, _height: number) => {}),
}));
vi.mock("@weng-lab/genomebrowser", async (original) => ({
  ...(await original<typeof import("@weng-lab/genomebrowser")>()),
  useInteraction: () => ({ onClick: hooks.click, onHover: hooks.hover, onLeave: hooks.leave }),
  useTooltip: () => ({ show: hooks.show, hide: hooks.hide }),
}));
vi.mock("../../src/shared/layout", async (original) => ({
  ...(await original<typeof import("../../src/shared/layout")>()),
  useTrackHeight: hooks.height,
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
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
const props = {
  ...track.base,
  config: track.config,
  width: 1500,
  region: { chromosome: "chr1", start: 0, end: 100 },
  visibleRegion: { chromosome: "chr1", start: 0, end: 100 },
};
function markup(
  display: string,
  data: BamData,
  overrides: Partial<typeof props> = {},
  basePairDetail = true,
) {
  const Renderer = bamModule.render[display];
  const element = document.createElement("div");
  element.innerHTML = renderToStaticMarkup(
    <TestBrowser basePairDetail={basePairDetail}>
      <svg>
        <Renderer {...props} {...overrides} data={data} />
      </svg>
    </TestBrowser>,
  );
  return element;
}
beforeEach(() => vi.clearAllMocks());
const letters = (element: HTMLElement, op = "M") =>
  [...element.querySelectorAll(`[data-bases="${op}"]`)].map((node) => node.textContent).join("");
const rowCount = (element: HTMLElement) =>
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
function stubJunctionCoordinates(group: SVGGElement) {
  group.getScreenCTM = () =>
    ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }) as DOMMatrix;
}
describe("BAM displays", () => {
  it("uses the visible span for the exclusive configurable zoom limit in every display", () => {
    const data = { records: [read()], reference: [] };
    const region = { chromosome: "chr1", start: 0, end: 150000 };
    for (const display of bamModule.displays) {
      for (const end of [50000, 50001]) {
        const result = markup(display, data, { region, visibleRegion: { ...region, end } });
        expect(result.querySelectorAll("[data-bam-read]")).toHaveLength(0);
      }
      const visibleRegion = { ...region, end: 49999 };
      expect(
        markup(display, data, { region, visibleRegion }).querySelectorAll("[data-bam-read]"),
      ).toHaveLength(1);
      const result = markup(display, data, {
        region,
        visibleRegion,
        config: { ...props.config, maxWindow: 40000 },
      });
      expect(result.querySelectorAll("[data-bam-read]")).toHaveLength(0);
    }
  });

  const records = [
    read(),
    read({ start: 15, end: 25, readName: "b", strand: "-", flags: 16 }),
    read({ start: 50, end: 60, readName: "c" }),
  ];
  it("draws dense in one row, packs squish/pack, and gives full reads separate rows", () => {
    const data = { records, reference: [] };
    for (const [display, rows, height] of [
      ["dense", 1, 14],
      ["squish", 2, 14],
      ["pack", 2, 28],
      ["full", 3, 42],
    ] as const) {
      expect(rowCount(markup(display, data))).toBe(rows);
      expect(hooks.height).toHaveBeenLastCalledWith("bam", height);
    }
    expect(markup("squish", data).querySelectorAll("text")).toHaveLength(0);
    expect(markup("pack", data).textContent).toContain("a");
  });
  it("uses blue/red strand outlines and darker aligned blocks", () => {
    const element = markup("pack", { records, reference: [] });
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
  it("draws CIGAR gaps and insertions at reference offsets and compares bases after gaps", () => {
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
    const element = markup("pack", {
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
      markup("pack", { records: [record], reference: [] }).querySelectorAll(
        '[data-mismatch="true"]',
      ),
    ).toHaveLength(0);
  });
  it("outlines the span of reads without CIGAR detail and labels it unavailable", () => {
    const record = read({ start: 10, end: 30, cigar: [] });
    const outline = markup("pack", { records: [record], reference: [] }).querySelector(
      "[data-cigar-unavailable]",
    );
    expect(outline?.getAttribute("x")).toBe("150");
    expect(outline?.getAttribute("width")).toBe("300");
    expect(outline?.getAttribute("fill")).toBe("none");
    expect(
      markup("pack", { records: [read()], reference: [] }).querySelector(
        "[data-cigar-unavailable]",
      ),
    ).toBeNull();
    const tooltip = document.createElement("div");
    tooltip.innerHTML = renderToStaticMarkup(
      <svg>
        <BamTooltip item={record} />
      </svg>,
    );
    const values = [...tooltip.querySelectorAll("text")].map((text) => text.textContent);
    expect(values[values.indexOf("CIGAR") + 1]).toBe("Unavailable");
  });
  it("uses CIGAR X without reference, preserves stored reverse sequence, and respects the shared detail decision", () => {
    const record = read({
      strand: "-",
      sequence: "ACGTAAAAAA",
      cigar: [{ op: "X", length: 10, sequenceOffset: 0, referenceOffset: 0 }],
    });
    const element = markup("full", { records: [record], reference: [] });
    expect(letters(element, "X")).toBe("ACGTAAAAAA");
    expect(element.querySelectorAll('[data-mismatch="true"]')).toHaveLength(10);
    const zoomedOut = markup(
      "full",
      { records: [record], reference: [] },
      { visibleRegion: { chromosome: "chr1", start: 0, end: 101 } },
      false,
    );
    expect(letters(zoomedOut, "X")).toBe("");
    expect(zoomedOut.querySelector('[data-cigar="X"]')?.getAttribute("fill")).toBe("#ef4444");
  });
  it("filters duplicates and unknown MAPQ locally and ignores other chromosomes", () => {
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
      markup("pack", data, {
        config: {
          ...track.config,
          filters: { includeDuplicates: false, minimumMappingQuality: 20 },
        },
      }).querySelectorAll("[data-bam-read]"),
    ).toHaveLength(1);
  });
  it("sizes only visible rows, keeps overscan reads, and reserves label bounds when packing", () => {
    const data = { records: [read(), read(), read({ start: 70, end: 80 })], reference: [] };
    markup("full", data, { visibleRegion: { chromosome: "chr1", start: 60, end: 90 } });
    expect(hooks.height).toHaveBeenLastCalledWith("bam", 14);
    const labels = {
      records: [read({ readName: "read_with_a_long_name" }), read({ start: 23, end: 33 })],
      reference: [],
    };
    expect(rowCount(markup("squish", labels))).toBe(1);
    expect(rowCount(markup("pack", labels))).toBe(2);
  });
  it("reserves space for a reference warning without hiding alignments", () => {
    const element = markup("squish", { records: [read()], reference: [], referenceError: "CORS" });
    expect(element.querySelector('[data-bam-row="0"]')?.getAttribute("transform")).toBe(
      "translate(0,14)",
    );
  });
  it("passes the complete alignment to click, hover, leave, and tooltip handlers", () => {
    const element = document.createElement("div");
    const root = createRoot(element);
    const record = read();
    const Renderer = bamModule.render.pack;
    try {
      act(() =>
        root.render(
          <TestBrowser basePairDetail>
            <svg>
              <Renderer {...props} data={{ records: [record], reference: [] }} />
            </svg>
          </TestBrowser>,
        ),
      );
      const glyph = element.querySelector("[data-bam-read]")!;
      act(() => {
        glyph.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        glyph.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        glyph.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      });
      expect(hooks.click).toHaveBeenCalledWith(record);
      expect(hooks.hover).toHaveBeenCalledWith(record);
      expect(hooks.leave).toHaveBeenCalledWith(record);
      expect(hooks.show.mock.calls[0][0]).toBe(record);
      expect(hooks.hide).toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
    }
  });
  it("wraps long tooltip values into aligned continuation rows", () => {
    const sequence = "ACGT".repeat(20);
    const cigar = Array.from({ length: 20 }, (_, index) => ({
      op: "M" as const,
      length: 123,
      referenceOffset: index * 123,
      sequenceOffset: index * 123,
    }));
    const element = document.createElement("div");
    element.innerHTML = renderToStaticMarkup(
      <svg>
        <BamTooltip item={read({ sequence, cigar })} />
      </svg>,
    );
    const values = [...element.querySelectorAll('text[x="84"]')].map(
      (node) => node.textContent ?? "",
    );
    expect(values.every((value) => value.length <= 32)).toBe(true);
    expect(values).toContain(sequence.slice(0, 32));
    expect(values).toContain(sequence.slice(64));
    const labels = [...element.querySelectorAll('text[x="0"]')].map((node) => node.textContent);
    expect(labels.filter((label) => label === "CIGAR")).toHaveLength(1);
    expect(labels.filter((label) => label === "Sequence")).toHaveLength(1);
    const cigarStart = values.indexOf("123M".repeat(8));
    expect(values.slice(cigarStart, cigarStart + 3).join("")).toBe("123M".repeat(20));
  });
  it("shows alignment metadata and distinguishes unavailable values in tooltips", () => {
    const html = renderToStaticMarkup(
      <svg>
        <BamTooltip
          item={read({
            flags: 1123,
            mappingQuality: 255,
            mate: { chromosome: "chr2", start: 123, strand: "-", unmapped: false },
            templateLength: -400,
            phredQualities: null,
          })}
        />
      </svg>,
    );
    for (const text of [
      "chr1:11–20",
      "10M",
      "Unavailable",
      "duplicate",
      "first in pair",
      "chr2:124 (-)",
      "-400",
      "AAAAAAAAAA",
    ])
      expect(html).toContain(text);
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
  const sectionTops = (element: HTMLElement) =>
    [...element.querySelectorAll("[data-bam-section]")].map((section) => [
      section.getAttribute("data-bam-section"),
      section.getAttribute("transform") ??
        section.querySelector("[data-bam-row]")?.getAttribute("transform"),
    ]);

  it("defaults to coverage above alignments and stacks sections in a fixed order", () => {
    expect(sectionTops(markup("pack", data, { config: defaults }))).toEqual([
      ["coverage", "translate(0,0)"],
      ["alignments", "translate(0,64)"],
    ]);
    expect(hooks.height).toHaveBeenLastCalledWith("bam", 60 + 4 + 2 * 14);
    const all = withSections({ coverage: true, junctions: true, alignments: true });
    expect(sectionTops(markup("full", data, { config: all }))).toEqual([
      ["coverage", "translate(0,0)"],
      ["junctions", "translate(0,64)"],
      ["alignments", "translate(0,168)"],
    ]);
  });
  it("gives hidden sections no space and keeps the read layout when alignments are hidden", () => {
    for (const [sections, height] of [
      [{ coverage: true }, 60],
      [{ junctions: true }, 100],
      [{ coverage: true, junctions: true }, 164],
      [{ alignments: true }, 14],
    ] as const) {
      const element = markup("squish", data, { config: withSections(sections) });
      expect(element.querySelector("[data-bam-display]")?.getAttribute("data-bam-display")).toBe(
        "squish",
      );
      expect(hooks.height).toHaveBeenLastCalledWith("bam", height);
    }
  });
  it("draws one arc per junction with its support and skips aggregates while zoomed out", () => {
    const config = withSections({ coverage: true, junctions: true });
    const junction = markup("pack", data, { config }).querySelector("[data-junction]");
    expect(junction?.getAttribute("data-junction")).toBe("15-35");
    expect(junction?.getAttribute("data-support")).toBe("2");
    expect(junction?.textContent).toBe("2");
    const minimumSupport = { ...config, junctions: { ...config.junctions, minimumSupport: 3 } };
    expect(markup("pack", data, { config: minimumSupport }).querySelector("[data-junction]")).toBe(
      null,
    );
    const zoomedOut = markup("pack", data, {
      config,
      visibleRegion: { chromosome: "chr1", start: 0, end: 60_000 },
    });
    expect(zoomedOut.querySelector("[data-bam-section]")).toBeNull();
  });
  it("scales coverage to the visible region, ignoring overscan", () => {
    const deep = Array.from({ length: 5 }, (_, index) =>
      read({ start: 80, end: 90, readName: `deep${index}`, strand: "-" }),
    );
    const config = withSections({ coverage: true });
    const scaleMax = (visibleRegion: typeof props.visibleRegion) =>
      markup("pack", { records: [read(), ...deep], reference: [] }, { config, visibleRegion })
        .querySelector('[data-bam-section="coverage"]')
        ?.getAttribute("data-scale-forward-max");
    expect(scaleMax({ chromosome: "chr1", start: 0, end: 50 })).toBe("1");
    expect(scaleMax({ chromosome: "chr1", start: 0, end: 100 })).toBe("5");
    const fixed = {
      ...config,
      coverage: {
        ...config.coverage,
        scale: { mode: "fixed" as const, forwardMax: 3, reverseMax: 3 },
      },
    };
    expect(
      markup("pack", { records: deep, reference: [] }, { config: fixed })
        .querySelector('[data-bam-section="coverage"]')
        ?.getAttribute("data-scale-forward-max"),
    ).toBe("3");
  });
  it.each(["bars", "line"] as const)(
    "draws %s coverage on a symmetric strand scale and clips both sides equally",
    (graph) => {
      const config = withSections({ coverage: true });
      config.coverage.graph = graph;
      const mixed = {
        records: [read(), read({ readName: "b" }), read({ readName: "reverse", strand: "-" })],
        reference: [],
      };
      const depthYs = (element: HTMLElement, strand: "+" | "-") => {
        const path = element
          .querySelector(`[data-bam-section="coverage"] path[data-strand="${strand}"]`)!
          .getAttribute("d")!;
        return graph === "bars"
          ? [...path.matchAll(/V ([\d.]+)/g)].map((match) => Number(match[1]))
          : [...path.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]));
      };
      const auto = markup("pack", mixed, { config, width: 100 });
      const coverage = auto.querySelector('[data-bam-section="coverage"]')!;
      expect(coverage.getAttribute("data-scale-forward-max")).toBe("2");
      expect(coverage.querySelector("line")?.getAttribute("y1")).toBe("30");
      expect(Math.min(...depthYs(auto, "+"))).toBe(0);
      expect(Math.max(...depthYs(auto, "-"))).toBe(45);
      const fixed = markup("pack", mixed, {
        config: {
          ...config,
          coverage: { ...config.coverage, scale: { mode: "fixed", forwardMax: 1, reverseMax: 1 } },
        },
        width: 100,
      });
      expect(Math.min(...depthYs(fixed, "+"))).toBe(0);
      expect(Math.max(...depthYs(fixed, "-"))).toBe(60);
      const empty = markup("pack", { records: [], reference: [] }, { config, width: 100 });
      expect(new Set(depthYs(empty, "+"))).toEqual(new Set([30]));
      expect(new Set(depthYs(empty, "-"))).toEqual(new Set([30]));
    },
  );
  it.each(["bars", "line"] as const)(
    "marks only overflowing %s coverage bins at both strand limits",
    (graph) => {
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
      const result = markup("pack", mixed, { config: fixed, width: 100 });
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
      expect(
        markup("pack", mixed, { config, width: 100 }).querySelector('[data-bam-clamp="true"]'),
      ).toBeNull();
      const hidden = { ...fixed, coverage: { ...fixed.coverage, showClampIndicators: false } };
      expect(
        markup("pack", mixed, { config: hidden, width: 100 }).querySelector(
          '[data-bam-clamp="true"]',
        ),
      ).toBeNull();
      const custom = { ...fixed, coverage: { ...fixed.coverage, clampIndicatorColor: "#123456" } };
      const customIndicators = markup("pack", mixed, {
        config: custom,
        width: 100,
      }).querySelectorAll('[data-bam-clamp="true"]');
      expect([...customIndicators].map((indicator) => indicator.getAttribute("stroke"))).toEqual([
        "#123456",
        "#123456",
      ]);
    },
  );
  it.each(["bars", "line"] as const)("scales %s coverage independently by strand", (graph) => {
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
    const draw = (reverseMax?: number) =>
      markup("pack", mixed, {
        width: 100,
        config: {
          ...config,
          coverage: {
            ...config.coverage,
            graph,
            scale: {
              mode: "fixed",
              forwardMax: 1,
              ...(reverseMax === undefined ? {} : { reverseMax }),
            },
          },
        },
      });
    const result = draw(4);
    const coverage = result.querySelector('[data-bam-section="coverage"]')!;
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
    const automaticReverse = draw().querySelector('[data-bam-section="coverage"]')!;
    expect(automaticReverse.getAttribute("data-scale-forward-max")).toBe("1");
    expect(automaticReverse.getAttribute("data-scale-reverse-max")).toBe("2");
    expect(automaticReverse.querySelector('[data-bam-clamp="true"][data-strand="-"]')).toBeNull();
  });
  it("uses the selected coverage summary when deciding whether a bin is clamped", () => {
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
    const draw = (aggregation: "mean" | "max") =>
      markup("pack", summarized, {
        width: 10,
        config: {
          ...config,
          coverage: {
            ...config.coverage,
            aggregation,
            scale: { mode: "fixed", forwardMax: 1, reverseMax: 1 },
          },
        },
      });
    // The [10,20) bin has mean depth 1 and maximum depth 2.
    expect(draw("mean").querySelector('[data-bam-clamp="true"]')).toBeNull();
    const indicator = draw("max").querySelector('[data-bam-clamp="true"]')!;
    expect(indicator.getAttribute("data-strand")).toBe("+");
    expect(
      indicator
        .getAttribute("d")!
        .match(/-?[\d.]+/g)!
        .map(Number),
    ).toEqual([1.5, 0, 0, 2]);
  });
  it("shares strand colors across sections and keeps coincident junction support separate", () => {
    const config = {
      ...withSections({ coverage: true, junctions: true, alignments: true }),
      strandColors: { forward: "#228844", reverse: "#8844cc" },
    };
    const reverse = { ...spliced, readName: "reverse", strand: "-" as const };
    const mixed = { ...data, records: [...data.records, reverse] };
    const element = markup("pack", mixed, { config });
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
    const threshold = markup("pack", mixed, {
      config: { ...config, junctions: { ...config.junctions, minimumSupport: 2 } },
    });
    expect(threshold.querySelectorAll("[data-junction]")).toHaveLength(1);
    expect(threshold.querySelector("[data-junction]")?.getAttribute("data-strand")).toBe("+");
  });
  it("clears a hovered junction when its strand falls below minimum support", () => {
    const config = withSections({ junctions: true });
    const mixed = {
      ...data,
      records: [...data.records, { ...spliced, readName: "reverse", strand: "-" as const }],
    };
    const element = document.createElement("div");
    const root = createRoot(element);
    const Renderer = bamModule.render.pack;
    const draw = (minimumSupport: number) =>
      act(() =>
        root.render(
          <TestBrowser basePairDetail>
            <svg>
              <Renderer
                {...props}
                config={{ ...config, junctions: { ...config.junctions, minimumSupport } }}
                data={mixed}
              />
            </svg>
          </TestBrowser>,
        ),
      );
    try {
      draw(1);
      const group = element.querySelector<SVGGElement>("[data-junction-group]")!;
      stubJunctionCoordinates(group);
      const reverse = group.querySelector('[data-strand="-"]')!;
      const reverseColor = reverse.querySelector("path")!.getAttribute("stroke");
      act(() =>
        reverse
          .querySelector('path[pointer-events="stroke"]')!
          .dispatchEvent(new MouseEvent("mousemove", { bubbles: true, ...junctionPoint(reverse) })),
      );
      expect(hooks.show).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: "junction", strand: "-", support: 1 }),
        expect.anything(),
      );
      expect(reverse.querySelector("path")!.getAttribute("stroke")).not.toBe(reverseColor);
      hooks.show.mockClear();
      hooks.hide.mockClear();

      // The forward arc keeps the same group mounted while the pointer stays still.
      draw(2);
      expect(element.querySelector("[data-junction-group]")).toBe(group);
      expect(group.querySelector('[data-strand="-"]')).toBeNull();
      expect(group.querySelector('[data-strand="+"]')).not.toBeNull();
      expect(hooks.hide).toHaveBeenCalledTimes(1);
      expect(hooks.show).not.toHaveBeenCalled();

      // Restoring the strand must not restore its old hover selection.
      draw(1);
      expect(group.querySelector('[data-strand="-"] path')!.getAttribute("stroke")).toBe(
        reverseColor,
      );
      expect(hooks.show).not.toHaveBeenCalled();

      draw(2);
      const forward = group.querySelector('[data-strand="+"]')!;
      act(() =>
        forward
          .querySelector('path[pointer-events="stroke"]')!
          .dispatchEvent(new MouseEvent("mousemove", { bubbles: true, ...junctionPoint(forward) })),
      );
      expect(hooks.show).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: "junction", strand: "+", support: 2 }),
        expect.anything(),
      );
    } finally {
      act(() => root.unmount());
    }
  });
  it.each([10, 23, 100])(
    "selects the nearer coincident junction at height %i regardless of the hit target",
    (height) => {
      const config = withSections({ junctions: true });
      config.junctions.height = height;
      const element = document.createElement("div");
      const root = createRoot(element);
      const Renderer = bamModule.render.pack;
      const draw = (currentConfig = config) =>
        act(() =>
          root.render(
            <TestBrowser basePairDetail>
              <svg>
                <Renderer
                  {...props}
                  config={currentConfig}
                  data={{
                    ...data,
                    records: [...data.records, { ...spliced, readName: "reverse", strand: "-" }],
                  }}
                />
              </svg>
            </TestBrowser>,
          ),
        );
      try {
        draw();
        const group = element.querySelector<SVGGElement>("[data-junction-group]")!;
        stubJunctionCoordinates(group);
        for (const strand of ["+", "-"]) {
          const arc = group.querySelector(`[data-strand="${strand}"]`)!;
          // Either overlapping hit path can receive the event. Its strand must
          // not override the curve nearest the actual pointer coordinates.
          const other = group.querySelector(
            `[data-strand="${strand === "+" ? "-" : "+"}"] path[pointer-events="stroke"]`,
          )!;
          act(() =>
            other.dispatchEvent(
              new MouseEvent("mousemove", {
                bubbles: true,
                ...junctionPoint(arc),
              }),
            ),
          );
          expect(hooks.show).toHaveBeenLastCalledWith(
            expect.objectContaining({ kind: "junction", strand, support: strand === "+" ? 2 : 1 }),
            expect.anything(),
          );
        }
        // Rebuilding the arc geometry on a palette update must retain the
        // stationary pointer's chosen strand highlight.
        const palette = { ...config, strandColors: { ...config.strandColors, reverse: "#3366cc" } };
        draw(palette);
        const reversePath = group.querySelector('[data-strand="-"] path')!;
        expect(reversePath.getAttribute("stroke")).toBe("#1f3d7a");
        act(() => group.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
        expect(hooks.hide).toHaveBeenCalled();
      } finally {
        act(() => root.unmount());
      }
    },
  );
  it("selects visible curves whose peaks are offscreen and prefers forward at the shared endpoint", () => {
    const element = document.createElement("div");
    const root = createRoot(element);
    const Renderer = bamModule.render.pack;
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
    try {
      act(() =>
        root.render(
          <TestBrowser basePairDetail>
            <svg>
              <Renderer
                {...props}
                region={region}
                visibleRegion={region}
                width={1000}
                config={withSections({ junctions: true })}
                data={{
                  records: [long, { ...long, readName: "reverse", strand: "-" }],
                  reference: [],
                }}
              />
            </svg>
          </TestBrowser>,
        ),
      );
      const group = element.querySelector<SVGGElement>("[data-junction-group]")!;
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
        [
          reverse,
          { clientX: 500, clientY: (forwardPoint.clientY + reversePoint.clientY) / 2 },
          "+",
        ],
        [reverse, { clientX: 0, clientY: 99 }, "+"],
      ] as const) {
        act(() =>
          arc
            .querySelector('path[pointer-events="stroke"]')!
            .dispatchEvent(new MouseEvent("mousemove", { bubbles: true, ...point })),
        );
        expect(hooks.show).toHaveBeenLastCalledWith(
          expect.objectContaining({ kind: "junction", strand, support: 1 }),
          expect.anything(),
        );
      }
    } finally {
      act(() => root.unmount());
    }
  });
  it("keeps packed reads on their rows while panning and when new data loads", () => {
    const element = document.createElement("div");
    const root = createRoot(element);
    const Renderer = bamModule.render.pack;
    const rowOf = () =>
      Object.fromEntries(
        [...element.querySelectorAll("[data-bam-read]")].map((node) => [
          node.getAttribute("data-bam-read"),
          node.getAttribute("data-bam-row"),
        ]),
      );
    const config = withSections({ alignments: true });
    const draw = (data: BamData, visibleStart: number) =>
      act(() =>
        root.render(
          <TestBrowser basePairDetail>
            <svg>
              <Renderer
                {...props}
                config={config}
                region={{ chromosome: "chr1", start: 0, end: 300 }}
                visibleRegion={{ chromosome: "chr1", start: visibleStart, end: visibleStart + 100 }}
                data={data}
              />
            </svg>
          </TestBrowser>,
        ),
      );
    try {
      const first = {
        records: [
          read({ readName: "left", start: 10, end: 60 }),
          read({ readName: "long", start: 20, end: 280 }),
          read({ readName: "right", start: 200, end: 250 }),
        ],
        reference: [],
      };
      draw(first, 0);
      const before = rowOf();
      draw(first, 180);
      expect(rowOf()).toEqual(before);
      // New data drops "left" and adds a read that would otherwise take its row.
      draw(
        {
          records: [
            read({ readName: "long", start: 20, end: 280 }),
            read({ readName: "right", start: 200, end: 250 }),
            read({ readName: "new", start: 5, end: 15 }),
          ],
          reference: [],
        },
        180,
      );
      expect(rowOf()).toMatchObject({ long: before.long, right: before.right });
    } finally {
      act(() => root.unmount());
    }
  });
  it.each(["mean", "max"] as const)(
    "excludes partial off-screen bins from %s autoscaling",
    (aggregation) => {
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
      const data = { records, reference: [] };
      const draw = (start: number, scale = config.coverage.scale) =>
        markup("pack", data, {
          config: { ...config, coverage: { ...config.coverage, scale } },
          width: 10,
          visibleRegion: { chromosome: "chr1", start, end: start + 70 },
        });
      // The render bin [10,20) straddles the viewport edge at 15. Its hidden peak
      // must not raise the scale, even though overscan remains ready for panning.
      expect(
        draw(15)
          .querySelector('[data-bam-section="coverage"]')
          ?.getAttribute("data-scale-forward-max"),
      ).toBe("1");
      expect(
        draw(5)
          .querySelector('[data-bam-section="coverage"]')
          ?.getAttribute("data-scale-forward-max"),
      ).toBe("10");
      expect(
        draw(15, { mode: "fixed", forwardMax: 3, reverseMax: 3 })
          .querySelector('[data-bam-section="coverage"]')
          ?.getAttribute("data-scale-forward-max"),
      ).toBe("3");
      expect(hooks.height).toHaveBeenLastCalledWith("bam", 60);
    },
  );
  it("repacks colliding labels after resize and respects a reduced row limit", () => {
    const element = document.createElement("div");
    const root = createRoot(element);
    const Renderer = bamModule.render.pack;
    const config = withSections({ alignments: true });
    const data = {
      records: [
        read({ readName: "long_read_name", start: 10, end: 20 }),
        read({ readName: "next_read", start: 40, end: 50 }),
      ],
      reference: [],
    };
    const draw = (width: number, currentConfig = config) =>
      act(() =>
        root.render(
          <TestBrowser basePairDetail>
            <svg>
              <Renderer {...props} config={currentConfig} width={width} data={data} />
            </svg>
          </TestBrowser>,
        ),
      );
    try {
      draw(1500);
      expect(rowCount(element)).toBe(1);
      // Keep data and config identities stable while labels outgrow the gap.
      draw(200);
      expect(rowCount(element)).toBe(2);
      expect(element.querySelectorAll("[data-bam-read]")).toHaveLength(2);
      draw(200, { ...config, alignments: { ...config.alignments, maxRows: 1 } });
      expect(rowCount(element)).toBe(1);
      expect(element.querySelectorAll("[data-bam-read]")).toHaveLength(1);
    } finally {
      act(() => root.unmount());
    }
  });
  it("draws at most maxRows alignment rows and discloses the rest while counting them", () => {
    const stacked = Array.from({ length: 5 }, (_, index) => read({ readName: `r${index}` }));
    const config = {
      ...withSections({ coverage: true, alignments: true }),
      alignments: { ...defaults.alignments, maxRows: 2 },
    };
    for (const display of ["pack", "full"]) {
      const element = markup(display, { records: stacked, reference: [] }, { config });
      expect(rowCount(element)).toBe(2);
      expect(hooks.height).toHaveBeenLastCalledWith("bam", 60 + 4 + 2 * 14 + 14);
      expect(
        element
          .querySelector('[data-bam-section="coverage"]')
          ?.getAttribute("data-scale-forward-max"),
      ).toBe("5");
    }
  });
  it("sends coverage bins and junctions to the tooltip without calling read interactions", () => {
    const element = document.createElement("div");
    const root = createRoot(element);
    const Renderer = bamModule.render.pack;
    try {
      act(() =>
        root.render(
          <TestBrowser basePairDetail>
            <svg>
              <Renderer
                {...props}
                config={withSections({ coverage: true, junctions: true })}
                data={{
                  ...data,
                  records: [...data.records, { ...spliced, strand: "-", readName: "reverse" }],
                }}
              />
            </svg>
          </TestBrowser>,
        ),
      );
      const overlays = [
        ...element.querySelectorAll<SVGRectElement>(
          '[data-bam-section="coverage"] rect[pointer-events="all"]',
        ),
      ];
      for (const overlay of overlays)
        overlay.getBoundingClientRect = () => ({ left: 0, width: 1500 }) as DOMRect;
      act(() => {
        for (const overlay of overlays)
          overlay.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 160 }));
      });
      const group = element.querySelector<SVGGElement>("[data-junction-group]")!;
      // The junction section starts below the coverage section. The inverse
      // screen transform converts pointer coordinates into its local space.
      group.getScreenCTM = () =>
        ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: -64 }) }) as DOMMatrix;
      for (const strand of ["+", "-"]) {
        const arc = group.querySelector(`[data-strand="${strand}"]`)!;
        const point = junctionPoint(arc);
        act(() =>
          arc.querySelector('path[pointer-events="stroke"]')!.dispatchEvent(
            new MouseEvent("mousemove", {
              bubbles: true,
              clientX: point.clientX,
              clientY: point.clientY + 64,
            }),
          ),
        );
      }
      expect(hooks.show.mock.calls[0][0]).toMatchObject({
        kind: "coverage",
        strand: "+",
        start: 10,
        end: 11,
        max: 2,
      });
      expect(hooks.show.mock.calls[1][0]).toMatchObject({ kind: "coverage", strand: "-", max: 1 });
      expect(hooks.show.mock.calls[2][0]).toMatchObject({
        kind: "junction",
        strand: "+",
        support: 2,
      });
      expect(hooks.show.mock.calls[3][0]).toMatchObject({
        kind: "junction",
        strand: "-",
        support: 1,
      });
      expect(hooks.hover).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
    }
  });
  it("labels per-base depth separately from summarized coverage in tooltips", () => {
    const tooltip = (item: Parameters<typeof BamTooltip>[0]["item"]) =>
      renderToStaticMarkup(
        <svg>
          <BamTooltip item={item} />
        </svg>,
      );
    const base = {
      kind: "coverage",
      strand: "+",
      chromosome: "chr1",
      start: 10,
      mean: 2,
      max: 2,
    } as const;
    expect(tooltip({ ...base, end: 11 })).toContain("Depth");
    expect(tooltip({ ...base, end: 11 })).toContain("+ (forward)");
    expect(tooltip({ ...base, end: 11, strand: "-" })).toContain("- (reverse)");
    expect(
      tooltip({
        kind: "junction",
        strand: "-",
        chromosome: "chr1",
        start: 15,
        end: 35,
        support: 1,
      }),
    ).toContain("- (reverse)");
    expect(tooltip({ ...base, end: 11 })).not.toContain("Mean depth");
    const summary = tooltip({ ...base, end: 20, mean: 1.25 });
    expect(summary).toContain("Coverage across 10 bases");
    expect(summary).toContain("Mean depth");
    expect(summary).toContain("1.25");
    expect(
      tooltip({
        kind: "junction",
        strand: "+",
        chromosome: "chr1",
        start: 15,
        end: 35,
        support: 2,
      }),
    ).toContain("2 alignments");
  });
});
