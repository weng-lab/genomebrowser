// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  onClick: vi.fn(),
  useRowLayout: vi.fn((_trackId: string, rowCount: number, config: { rowHeight: number }) => ({
    rowHeight: config.rowHeight,
    trackHeight: Math.max(1, rowCount) * config.rowHeight,
  })),
}));

vi.mock("@weng-lab/genomebrowser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomebrowser")>()),
  useInteraction: () => ({ onClick: runtime.onClick }),
  useTooltip: () => ({ hide: vi.fn(), show: vi.fn() }),
}));

vi.mock("../../src/shared/layout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/shared/layout")>()),
  useRowLayout: runtime.useRowLayout,
}));

import { PackGene, SquishGene } from "../../src/gene/render";
import type { GeneData, GeneTranscript } from "../../src/gene/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const firstTranscript = transcript("tx1", "gene1", 100, 180);
const data: GeneData = [
  firstTranscript,
  transcript("tx2", "gene1", 120, 200),
  transcript("tx3", "gene2", 300, 350),
];
const props = {
  id: "genes",
  color: "#4b9560",
  config: { url: "YOUR_URL_HERE", rowHeight: 16 },
  data,
  region: { chromosome: "chr1", start: 0, end: 500 },
  width: 500,
  height: 16,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  runtime.onClick.mockClear();
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
  it("renders one unlabeled rectangle per transcript and preserves genomic interaction data", () => {
    render(<PackGene {...props} />);

    const rectangles = interactiveRectangles();
    expect(rectangles).toHaveLength(3);
    expect(container.querySelector("text")).toBeNull();
    act(() => rectangles[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(runtime.onClick).toHaveBeenCalledWith(firstTranscript);
    expect(runtime.onClick.mock.calls[0]![0]).toMatchObject({ start: 100, end: 180 });
  });

  it("groups transcripts by gene in squish mode before packing rows", () => {
    render(<SquishGene {...props} />);

    expect(interactiveRectangles()).toHaveLength(2);
    expect(runtime.useRowLayout).toHaveBeenCalledWith("genes", 1, props.config);
    const first = interactiveRectangles()[0]!;
    expect(first.getAttribute("x")).toBe("100");
    expect(first.getAttribute("width")).toBe("100");
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
): GeneTranscript {
  return {
    kind: "transcript",
    chromosome: "chr1",
    start,
    end,
    strand: "+",
    transcriptId,
    geneId,
    geneName: geneId,
    exons: [{ start, end, frame: 0 }],
    source: {
      chromosome: "chr1",
      start,
      end,
      name: transcriptId,
      score: 0,
      strand: "+",
      thickStart: start,
      thickEnd: end,
      reserved: "0",
      blockCount: 1,
      blockSizes: [end - start],
      chromStarts: [0],
      name2: transcriptId,
      cdsStartStat: "cmpl",
      cdsEndStat: "cmpl",
      exonFrames: [0],
      type: "coding",
      geneName: geneId,
      geneName2: geneId,
      geneType: "protein_coding",
      fields: [],
    },
  };
}
