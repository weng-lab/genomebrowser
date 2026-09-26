// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bamModule, type BamRecord, type BamData } from "@weng-lab/genomebrowser-tracks/bam";
import { BamTooltip } from "../../src/bam/tooltip";

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
function markup(display: string, data: BamData, overrides: Partial<typeof props> = {}) {
  const Renderer = bamModule.render[display];
  const element = document.createElement("div");
  element.innerHTML = renderToStaticMarkup(
    <svg>
      <Renderer {...props} {...overrides} data={data} />
    </svg>,
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
describe("BAM displays", () => {
  it("uses the configurable visible span for letters independently of width and overscan", () => {
    const data = { records: [read()], reference: [] };
    for (const display of ["pack", "full"]) {
      for (const width of [500, 1500]) {
        expect(
          letters(
            markup(display, data, {
              width,
              visibleRegion: { chromosome: "chr1", start: 0, end: 101 },
            }),
          ),
        ).toBe("");
        expect(
          letters(
            markup(display, data, {
              width,
              region: { chromosome: "chr1", start: 0, end: 300 },
            }),
          ),
        ).toBe("AAAAAAAAAA");
      }
      expect(
        letters(
          markup(display, data, {
            config: {
              ...track.config,
              alignments: { ...track.config.alignments, sequenceMaxWindow: 99 },
            },
          }),
        ),
      ).toBe("");
      expect(
        letters(
          markup(display, data, {
            config: {
              ...track.config,
              alignments: { ...track.config.alignments, sequenceMaxWindow: 200 },
            },
            visibleRegion: { chromosome: "chr1", start: 0, end: 200 },
          }),
        ),
      ).toBe("AAAAAAAAAA");
    }
  });
  it("uses the visible span for the exclusive configurable zoom limit in every display", () => {
    const data = { records: [read()], reference: [] };
    const region = { chromosome: "chr1", start: 0, end: 150000 };
    for (const display of bamModule.displays) {
      for (const end of [50000, 50001]) {
        const result = markup(display, data, { region, visibleRegion: { ...region, end } });
        expect(result.textContent).toContain("Zoom in to see BAM track");
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
      expect(result.textContent).toContain("Zoom in to see BAM track");
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
  it("uses CIGAR X without reference, preserves stored reverse sequence, and suppresses letters at broad zoom", () => {
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
  it("renders zoom and reference status messages without hiding alignments", () => {
    expect(
      markup("dense", { records: [], reference: [], message: "Zoom in to view alignments." })
        .textContent,
    ).toContain("Zoom in");
    const element = markup("squish", { records: [read()], reference: [], referenceError: "CORS" });
    expect(element.textContent).toContain("Reference unavailable");
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
          <svg>
            <Renderer {...props} data={{ records: [record], reference: [] }} />
          </svg>,
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
      "chr1:10–20",
      "10M",
      "Unavailable",
      "duplicate",
      "first in pair",
      "chr2:123 (-)",
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
    expect(zoomedOut.textContent).toContain("Zoom in");
  });
  it("scales coverage to the visible region, ignoring overscan", () => {
    const deep = Array.from({ length: 5 }, (_, index) =>
      read({ start: 80, end: 90, readName: `deep${index}` }),
    );
    const config = withSections({ coverage: true });
    const scaleMax = (visibleRegion: typeof props.visibleRegion) =>
      markup("pack", { records: [read(), ...deep], reference: [] }, { config, visibleRegion })
        .querySelector('[data-bam-section="coverage"]')
        ?.getAttribute("data-scale-max");
    expect(scaleMax({ chromosome: "chr1", start: 0, end: 50 })).toBe("1");
    expect(scaleMax({ chromosome: "chr1", start: 0, end: 100 })).toBe("5");
    const fixed = {
      ...config,
      coverage: { ...config.coverage, scale: { mode: "fixed" as const, max: 3 } },
    };
    expect(
      markup("pack", { records: deep, reference: [] }, { config: fixed })
        .querySelector('[data-bam-section="coverage"]')
        ?.getAttribute("data-scale-max"),
    ).toBe("3");
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
          <svg>
            <Renderer
              {...props}
              config={config}
              region={{ chromosome: "chr1", start: 0, end: 300 }}
              visibleRegion={{ chromosome: "chr1", start: visibleStart, end: visibleStart + 100 }}
              data={data}
            />
          </svg>,
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
        draw(15).querySelector('[data-bam-section="coverage"]')?.getAttribute("data-scale-max"),
      ).toBe("1");
      expect(
        draw(5).querySelector('[data-bam-section="coverage"]')?.getAttribute("data-scale-max"),
      ).toBe("10");
      expect(
        draw(15, { mode: "fixed", max: 3 })
          .querySelector('[data-bam-section="coverage"]')
          ?.getAttribute("data-scale-max"),
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
          <svg>
            <Renderer {...props} config={currentConfig} width={width} data={data} />
          </svg>,
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
      expect(element.querySelector("[data-bam-hidden]")?.getAttribute("data-bam-hidden")).toBe("1");
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
      expect(element.querySelector("[data-bam-hidden]")?.getAttribute("data-bam-hidden")).toBe("3");
      expect(hooks.height).toHaveBeenLastCalledWith("bam", 60 + 4 + 2 * 14 + 14);
      expect(
        element.querySelector('[data-bam-section="coverage"]')?.getAttribute("data-scale-max"),
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
          <svg>
            <Renderer
              {...props}
              config={withSections({ coverage: true, junctions: true })}
              data={data}
            />
          </svg>,
        ),
      );
      const overlay = element.querySelector<SVGRectElement>(
        '[data-bam-section="coverage"] rect[pointer-events="all"]',
      )!;
      overlay.getBoundingClientRect = () => ({ left: 0, width: 1500 }) as DOMRect;
      act(() => {
        overlay.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 160 }));
        element
          .querySelector("[data-junction]")!
          .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      });
      expect(hooks.show.mock.calls[0][0]).toMatchObject({
        kind: "coverage",
        start: 10,
        end: 11,
        max: 2,
      });
      expect(hooks.show.mock.calls[1][0]).toMatchObject({ kind: "junction", support: 2 });
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
    const base = { kind: "coverage", chromosome: "chr1", start: 10, mean: 2, max: 2 } as const;
    expect(tooltip({ ...base, end: 11 })).toContain("Depth");
    expect(tooltip({ ...base, end: 11 })).not.toContain("Mean depth");
    const summary = tooltip({ ...base, end: 20, mean: 1.25 });
    expect(summary).toContain("Coverage across 10 bases");
    expect(summary).toContain("Mean depth");
    expect(summary).toContain("1.25");
    expect(
      tooltip({ kind: "junction", chromosome: "chr1", start: 15, end: 35, support: 2 }),
    ).toContain("2 alignments");
  });
});
