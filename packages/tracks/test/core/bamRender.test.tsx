import { BasePairDetailContext } from "../../../core/src/browser/viewport/basePairDetail";
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
  layout: vi.fn((_id: string, count: number, config: { rowHeight: number }) => ({
    rowHeight: config.rowHeight,
    trackHeight: Math.max(1, count) * config.rowHeight,
  })),
}));
vi.mock("@weng-lab/genomebrowser", async (original) => ({
  ...(await original<typeof import("@weng-lab/genomebrowser")>()),
  useInteraction: () => ({ onClick: hooks.click, onHover: hooks.hover, onLeave: hooks.leave }),
  useTooltip: () => ({ show: hooks.show, hide: hooks.hide }),
}));
vi.mock("../../src/shared/layout", async (original) => ({
  ...(await original<typeof import("../../src/shared/layout")>()),
  useRowLayout: hooks.layout,
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
const track = bamModule.create({
  base: { id: "bam", title: "Alignments" },
  config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
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
    <BasePairDetailContext
      value={{
        subscribe: () => () => {},
        getBasePairDetailStatus: () => ({ reason: "ready", zoomTargetBases: 100 }),
        getBasePairDetail: () => basePairDetail,
      }}
    >
      <svg>
        <Renderer {...props} {...overrides} data={data} />
      </svg>
    </BasePairDetailContext>,
  );
  return element;
}
beforeEach(() => vi.clearAllMocks());
describe("BAM displays", () => {
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
    expect(markup("dense", data).querySelectorAll("[data-bam-row]")).toHaveLength(1);
    expect(markup("squish", data).querySelectorAll("[data-bam-row]")).toHaveLength(2);
    expect(markup("pack", data).querySelectorAll("[data-bam-row]")).toHaveLength(2);
    expect(markup("full", data).querySelectorAll("[data-bam-row]")).toHaveLength(3);
    expect(hooks.layout.mock.calls.map(([, count, config]) => [count, config.rowHeight])).toEqual([
      [1, 14],
      [2, 7],
      [2, 14],
      [3, 14],
    ]);
    expect(markup("squish", data).querySelectorAll("text")).toHaveLength(0);
    expect(markup("pack", data).textContent).toContain("a");
  });
  it("uses blue/red strand outlines and darker aligned blocks", () => {
    const element = markup("pack", { records, reference: [] });
    expect(
      element.querySelector('[data-bam-read="a"] [data-cigar="M"] rect')?.getAttribute("fill"),
    ).toBe("#1f3d7a");
    expect(
      element.querySelector('[data-bam-read="a"] [data-cigar="M"] rect')?.getAttribute("stroke"),
    ).toBe("#3366cc");
    expect(
      element.querySelector('[data-bam-read="b"] [data-cigar="M"] rect')?.getAttribute("fill"),
    ).toBe("#7a1f1f");
    expect(
      element.querySelector('[data-bam-read="b"] [data-cigar="M"] rect')?.getAttribute("stroke"),
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
    expect(element.querySelector('[data-cigar="N"]')?.getAttribute("x1")).toBe("180");
    expect(element.querySelector('[data-cigar="N"]')?.getAttribute("x2")).toBe("300");
    expect(element.querySelector('[data-cigar="N"]')?.getAttribute("stroke-dasharray")).toBe("3 2");
    expect(element.querySelector('[data-cigar="D"]')?.getAttribute("x1")).toBe("300");
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
    expect(element.querySelector('[data-cigar="X"]')?.textContent).toBe("ACGTAAAAAA");
    expect(element.querySelectorAll('[data-mismatch="true"]')).toHaveLength(10);
    expect(
      markup("full", { records: [record], reference: [] }, {}, false).querySelector(
        '[data-cigar="X"]',
      )?.textContent,
    ).toBe("");
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
    expect(hooks.layout).toHaveBeenLastCalledWith("bam", 1, { rowHeight: 14 });
    const labels = {
      records: [read({ readName: "read_with_a_long_name" }), read({ start: 23, end: 33 })],
      reference: [],
    };
    expect(markup("squish", labels).querySelectorAll("[data-bam-row]")).toHaveLength(1);
    expect(markup("pack", labels).querySelectorAll("[data-bam-row]")).toHaveLength(2);
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
          <BasePairDetailContext
            value={{
              subscribe: () => () => {},
              getBasePairDetailStatus: () => ({ reason: "ready", zoomTargetBases: 100 }),
              getBasePairDetail: () => true,
            }}
          >
            <svg>
              <Renderer {...props} data={{ records: [record], reference: [] }} />
            </svg>
          </BasePairDetailContext>,
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
