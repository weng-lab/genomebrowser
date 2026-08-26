// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  onClick: vi.fn(),
  onHover: vi.fn(),
  onLeave: vi.fn(),
  tooltipShow: vi.fn(),
  tooltipHide: vi.fn(),
  createCompositeGeneGeometry: vi.fn(),
  createGeneTranscriptGeometry: vi.fn(),
  useRowLayout: vi.fn((_trackId: string, rowCount: number, config: { rowHeight: number }) => ({
    rowHeight: config.rowHeight,
    trackHeight: Math.max(1, rowCount) * config.rowHeight,
  })),
}));

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useInteraction: () => ({
    onClick: runtime.onClick,
    onHover: runtime.onHover,
    onLeave: runtime.onLeave,
  }),
  useTooltip: () => ({ hide: runtime.tooltipHide, show: runtime.tooltipShow }),
}));

vi.mock("../../src/shared/layout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/shared/layout")>()),
  useRowLayout: runtime.useRowLayout,
}));

vi.mock("../../src/gene/geometry", async (importOriginal) => {
  const geometry = await importOriginal<typeof import("../../src/gene/geometry")>();
  return {
    ...geometry,
    createCompositeGeneGeometry: (
      gene: Parameters<typeof geometry.createCompositeGeneGeometry>[0],
    ) => {
      runtime.createCompositeGeneGeometry(gene);
      return geometry.createCompositeGeneGeometry(gene);
    },
    createGeneTranscriptGeometry: (
      transcript: Parameters<typeof geometry.createGeneTranscriptGeometry>[0],
    ) => {
      runtime.createGeneTranscriptGeometry(transcript);
      return geometry.createGeneTranscriptGeometry(transcript);
    },
  };
});

import { PackGene, SquishGene } from "../../src/gene/render";
import type { GeneData, GeneTranscript } from "../../src/gene/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const firstTranscript = transcript("tx1", "gene1", 100, 180, {
  strand: "-",
  exons: [
    { start: 100, end: 120, frame: 0 },
    { start: 150, end: 180, frame: 1 },
  ],
  thickStart: 110,
  thickEnd: 170,
});
const data: GeneData = [
  firstTranscript,
  transcript("tx2", "gene1", 120, 200, {
    strand: "-",
    thickStart: 120,
    thickEnd: 120,
  }),
  transcript("tx3", "gene2", 300, 350, {
    exons: [
      { start: 300, end: 315, frame: 0 },
      { start: 335, end: 350, frame: 1 },
    ],
  }),
];
const props = {
  id: "genes",
  color: "#4b9560",
  config: { url: "YOUR_URL_HERE", highlightColor: "#000000", rowHeight: 16 },
  data,
  region: { chromosome: "chr1", start: 0, end: 500 },
  width: 500,
  height: 16,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  runtime.onClick.mockClear();
  runtime.onHover.mockClear();
  runtime.onLeave.mockClear();
  runtime.tooltipShow.mockClear();
  runtime.tooltipHide.mockClear();
  runtime.createCompositeGeneGeometry.mockClear();
  runtime.createGeneTranscriptGeometry.mockClear();
  runtime.useRowLayout.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Gene rendering", () => {
  it("renders distinct transcript parts with transcript labels", () => {
    render(<PackGene {...props} />);

    expect(container.querySelectorAll('[data-gene-part="intron"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-gene-part="utr"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-gene-part="cds"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-gene-part="noncoding-exon"]')).toHaveLength(1);
    const directionMarks = Array.from(container.querySelectorAll("[data-intron-direction-mark]"));
    expect(directionMarks).toHaveLength(2);
    expect(directionMarks.map((mark) => mark.getAttribute("points"))).toEqual([
      "138,5 135,8 138,11",
      "322,5 325,8 322,11",
    ]);
    expect(directionMarks.every((mark) => mark.getAttribute("pointer-events") === "none")).toBe(
      true,
    );
    expect(directionMarks.every((mark) => !mark.hasAttribute("data-gene-part"))).toBe(true);
    expect(
      container
        .querySelector('[data-gene-part="utr"][data-exon-index="0"]')
        ?.getAttribute("data-transcription-index"),
    ).toBe("1");
    expect(
      Array.from(container.querySelectorAll('[data-gene-part="utr"]')).map((part) =>
        part.getAttribute("data-utr-side"),
      ),
    ).toEqual(["3-prime", "5-prime"]);
    expect(
      Array.from(container.querySelectorAll("[data-gene-label]"))
        .map((label) => label.textContent)
        .toSorted(),
    ).toEqual(["tx1", "tx2", "tx3"]);
  });

  it("uses one generous transcript hit target for click, hover, tooltip, and leave behavior", () => {
    render(<PackGene {...props} />);

    const part = container.querySelector('[data-gene-part="cds"]')!;
    const directionMark = container.querySelector("[data-intron-direction-mark]")!;
    const hitTarget = container.querySelector<SVGRectElement>("[data-transcript-hit-target]")!;
    expect(part.getAttribute("pointer-events")).toBe("none");
    expect(hitTarget.getAttribute("x")).toBe("100");
    expect(hitTarget.getAttribute("width")).toBe("80");
    expect(hitTarget.getAttribute("height")).toBe("16");

    act(() => part.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => directionMark.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(runtime.onClick).not.toHaveBeenCalled();
    act(() => hitTarget.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(runtime.onClick).toHaveBeenCalledWith(firstTranscript);
    expect(runtime.onClick.mock.calls[0]![0]).toMatchObject({ start: 100, end: 180 });

    act(() => hitTarget.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(runtime.onHover).toHaveBeenCalledWith(firstTranscript);
    expect(runtime.tooltipShow).toHaveBeenCalledWith(firstTranscript, expect.anything());
    act(() => hitTarget.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(runtime.onLeave).toHaveBeenCalledWith(firstTranscript);
    expect(runtime.tooltipHide).toHaveBeenCalledOnce();
  });

  it("renders grouped genes as composite structures in shared rows", () => {
    render(<SquishGene {...props} />);

    expect(interactiveRectangles()).toHaveLength(2);
    expect(runtime.useRowLayout).toHaveBeenCalledWith("genes", 1, props.config);
    expect(container.querySelectorAll('[data-gene-part="intron"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-gene-part="utr"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-gene-part="cds"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-gene-part="noncoding-exon"]')).toHaveLength(2);
    const alternativeExon = container.querySelector(
      '[data-gene-part="noncoding-exon"][data-contributing-transcript-ids="tx2"]',
    )!;
    expect(alternativeExon.getAttribute("x")).toBe("120");
    expect(alternativeExon.getAttribute("width")).toBe("30");
    expect(alternativeExon.getAttribute("height")).toBe("6.4");
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("height")).toBe("11.2");
    expect(container.querySelectorAll("[data-intron-direction-mark]")).toHaveLength(1);
    expect(container.querySelector("[data-intron-direction-mark]")?.getAttribute("points")).toBe(
      "322,5 325,8 322,11",
    );
    expect(
      Array.from(container.querySelectorAll("[data-gene-label]")).map((label) => label.textContent),
    ).toEqual(["gene1", "gene2"]);
  });

  it("highlights matching genes and their labels case-insensitively", () => {
    render(
      <PackGene
        {...props}
        config={{ ...props.config, geneName: "GENE1", highlightColor: "#123456" }}
      />,
    );

    const labels = Array.from(container.querySelectorAll<SVGTextElement>("[data-gene-label]"));
    expect(
      labels
        .map((label) => [label.textContent, label.getAttribute("fill")])
        .toSorted(([left], [right]) => left!.localeCompare(right!)),
    ).toEqual([
      ["tx1", "#123456"],
      ["tx2", "#123456"],
      ["tx3", props.color],
    ]);
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("fill")).toBe("#123456");
  });

  it("uses one gene-level target for composite click, hover, tooltip, and leave behavior", () => {
    render(<SquishGene {...props} />);

    const piece = container.querySelector(
      '[data-gene-part="noncoding-exon"][data-contributing-transcript-ids="tx2"]',
    )!;
    const hitTarget = container.querySelector<SVGRectElement>("[data-gene-hit-target]")!;
    expect(container.querySelectorAll("[data-gene-hit-target]")).toHaveLength(2);
    expect(piece.getAttribute("pointer-events")).toBe("none");
    expect(hitTarget.getAttribute("x")).toBe("100");
    expect(hitTarget.getAttribute("width")).toBe("100");
    expect(hitTarget.getAttribute("height")).toBe("16");

    act(() => piece.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(runtime.onClick).not.toHaveBeenCalled();
    act(() => hitTarget.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(runtime.onClick).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "gene",
        start: 100,
        end: 200,
        transcripts: [firstTranscript, data[1]],
      }),
    );

    act(() => hitTarget.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(runtime.onHover).toHaveBeenCalledWith(expect.objectContaining({ kind: "gene" }));
    expect(runtime.tooltipShow).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "gene" }),
      expect.anything(),
    );
    act(() => hitTarget.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(runtime.onLeave).toHaveBeenCalledWith(expect.objectContaining({ kind: "gene" }));
    expect(runtime.tooltipHide).toHaveBeenCalledOnce();
  });

  it("reuses composite geometry when ordinary rerenders keep the same data", () => {
    render(<SquishGene {...props} />);
    expect(runtime.createCompositeGeneGeometry).toHaveBeenCalledTimes(2);

    render(<SquishGene {...props} color="#123456" />);
    expect(runtime.createCompositeGeneGeometry).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("fill")).toBe("#123456");
  });

  it("reuses transcript geometry when ordinary rerenders keep the same data", () => {
    render(<PackGene {...props} />);
    expect(runtime.createGeneTranscriptGeometry).toHaveBeenCalledTimes(3);

    render(<PackGene {...props} color="#123456" />);
    expect(runtime.createGeneTranscriptGeometry).toHaveBeenCalledTimes(3);
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("fill")).toBe("#123456");
  });
});

function render(node: ReactNode) {
  act(() => root.render(<svg>{node}</svg>));
}

function interactiveRectangles() {
  return Array.from(container.querySelectorAll("rect")).filter(
    (rectangle) => rectangle.getAttribute("pointer-events") !== "none",
  );
}

function transcript(
  transcriptId: string,
  geneId: string,
  start: number,
  end: number,
  options: {
    strand?: "+" | "-";
    exons?: GeneTranscript["exons"];
    thickStart?: number;
    thickEnd?: number;
  } = {},
): GeneTranscript {
  const strand = options.strand ?? "+";
  const exons = options.exons ?? [{ start, end, frame: 0 }];
  return {
    kind: "transcript",
    chromosome: "chr1",
    start,
    end,
    strand,
    transcriptId,
    geneId,
    geneName: geneId,
    exons,
    source: {
      chromosome: "chr1",
      start,
      end,
      name: transcriptId,
      score: 0,
      strand,
      thickStart: options.thickStart ?? start,
      thickEnd: options.thickEnd ?? end,
      reserved: "0",
      blockCount: exons.length,
      blockSizes: exons.map((exon) => exon.end - exon.start),
      chromStarts: exons.map((exon) => exon.start - start),
      name2: transcriptId,
      cdsStartStat: "cmpl",
      cdsEndStat: "cmpl",
      exonFrames: exons.map((exon) => exon.frame),
      type: "coding",
      geneName: geneId,
      geneName2: geneId,
      geneType: "protein_coding",
      fields: [],
    },
  };
}
