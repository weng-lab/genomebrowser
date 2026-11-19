// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  geneModule,
  type GeneCreateInput,
  type GeneData,
  type GeneInteractionTarget,
  type GeneTranscript,
} from "@weng-lab/genomebrowser-tracks/gene";
import { mountTrack, type MountedTrack } from "../mountTrack";

const firstTranscript = transcript("tx1", "gene1", 100, 180, {
  tags: ["MANE_Select"],
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
const color = "#4b9560";
const config = {
  url: "YOUR_URL_HERE",
  tagColors: [{ tag: "MANE_Select", color: "#d45c2f" }],
  highlightColor: "#000000",
  rowHeight: 16,
};
const region = { chromosome: "chr1", start: 0, end: 500 };
const interaction = {
  onClick: vi.fn<(item: GeneInteractionTarget) => void>(),
  onHover: vi.fn<(item: GeneInteractionTarget) => void>(),
  onLeave: vi.fn<(item: GeneInteractionTarget) => void>(),
};
/** Callbacks receive the track the item belongs to after the item. */
const geneTrack = expect.objectContaining({ base: expect.objectContaining({ id: "genes" }) });

let view: MountedTrack | undefined;
let container: Element;
afterEach(async () => {
  interaction.onClick.mockClear();
  interaction.onHover.mockClear();
  interaction.onLeave.mockClear();
  await view?.unmount();
  view = undefined;
});

describe("Gene rendering", () => {
  it("renders distinct transcript parts with transcript labels", async () => {
    await render("full");

    expect(container.querySelectorAll('[data-gene-part="intron"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-gene-part="utr"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-gene-part="cds"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-gene-part="noncoding-exon"]')).toHaveLength(1);
    expect(container.querySelectorAll("[data-gene-part-hit-target]")).toHaveLength(9);
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
      Array.from(container.querySelectorAll("[data-gene-part]")).every(
        (part) =>
          !part.hasAttribute("data-exon-index") &&
          !part.hasAttribute("data-transcription-index") &&
          !part.hasAttribute("data-frame"),
      ),
    ).toBe(true);
    expect(
      Array.from(container.querySelectorAll("[data-gene-label]"))
        .map((label) => label.textContent)
        .toSorted(),
    ).toEqual(["tx1", "tx2", "tx3"]);
  });

  it("uses separate generous transcript part targets for click, hover, tooltip, and leave", async () => {
    const mounted = await render("full");

    const part = container.querySelector('[data-gene-part="cds"]')!;
    const directionMark = container.querySelector("[data-intron-direction-mark]")!;
    const hitTarget = container.querySelector<SVGRectElement>("[data-transcript-hit-target]")!;
    const partHitTarget = container.querySelector<SVGRectElement>(
      '[data-gene-part-hit-target][data-gene-part-id="cds-0-110-120"]',
    )!;
    expect(part.getAttribute("pointer-events")).toBe("none");
    expect(hitTarget.getAttribute("x")).toBe("100");
    expect(hitTarget.getAttribute("width")).toBe("80");
    expect(hitTarget.getAttribute("height")).toBe("16");
    expect(hitTarget.getAttribute("fill")).toBe("transparent");

    await mounted.click(part);
    await mounted.click(directionMark);
    expect(interaction.onClick).not.toHaveBeenCalled();
    expect(partHitTarget.getAttribute("x")).toBe("110");
    expect(partHitTarget.getAttribute("width")).toBe("10");
    expect(partHitTarget.getAttribute("height")).toBe("16");
    await mounted.click(partHitTarget);
    expect(interaction.onClick).toHaveBeenCalledWith(
      {
        kind: "part",
        feature: firstTranscript,
        part: expect.objectContaining({
          kind: "cds",
          start: 110,
          end: 120,
          source: "transcript",
        }),
      },
      geneTrack,
    );

    // tx1 is on the minus strand, so its 100-120 exon is the second one transcribed.
    expect(await mounted.hover(partHitTarget)).toContain(
      "gene1PartCDSLocationchr1:111–120Length10 bpTranscript Nametx1Transcript IDtx1Exon2 of 2",
    );
    expect(interaction.onHover).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "part", feature: firstTranscript }),
      geneTrack,
    );
    expect(await leave(mounted, partHitTarget)).toBe("");
    expect(interaction.onLeave).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "part", feature: firstTranscript }),
      geneTrack,
    );
  });

  it("renders grouped genes as composite structures in shared rows", async () => {
    const mounted = await render("merged");

    expect(container.querySelectorAll("[data-gene-hit-target]")).toHaveLength(2);
    expect(trackHeight(mounted)).toBe(16);
    expect(container.querySelectorAll('[data-gene-part="intron"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-gene-part="utr"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-gene-part="cds"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-gene-part="noncoding-exon"]')).toHaveLength(2);
    expect(container.querySelectorAll("[data-gene-part-hit-target]")).toHaveLength(9);
    const alternativeExon = container.querySelector('[data-gene-part="noncoding-exon"]')!;
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

  it("derives row count from visible genes while retaining render-window genes", async () => {
    const mounted = await render("full", {
      visibleRegion: { chromosome: "chr1", start: 250, end: 400 },
    });

    expect(trackHeight(mounted)).toBe(16);
    expect(container.querySelectorAll("[data-gene-label]")).toHaveLength(3);
  });

  it("highlights matching genes and their labels case-insensitively", async () => {
    await render("full", {
      config: { ...config, geneName: "GENE1", highlightColor: "#123456" },
    });

    const labels = Array.from(container.querySelectorAll<SVGTextElement>("[data-gene-label]"));
    expect(
      labels
        .map((label) => [label.textContent, label.getAttribute("fill")])
        .toSorted(([left], [right]) => left!.localeCompare(right!)),
    ).toEqual([
      ["tx1", "#123456"],
      ["tx2", "#123456"],
      ["tx3", color],
    ]);
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("fill")).toBe("#123456");
  });

  it("uses typed merged part targets while retaining a gene-level target for gaps", async () => {
    const mounted = await render("merged");

    const piece = container.querySelector('[data-gene-part="noncoding-exon"]')!;
    const hitTarget = container.querySelector<SVGRectElement>("[data-gene-hit-target]")!;
    expect(container.querySelectorAll("[data-gene-hit-target]")).toHaveLength(2);
    expect(piece.getAttribute("pointer-events")).toBe("none");
    expect(hitTarget.getAttribute("x")).toBe("100");
    expect(hitTarget.getAttribute("width")).toBe("100");
    expect(hitTarget.getAttribute("height")).toBe("16");
    expect(hitTarget.getAttribute("fill")).toBe("transparent");

    await mounted.click(piece);
    expect(interaction.onClick).not.toHaveBeenCalled();
    await mounted.click(hitTarget);
    expect(interaction.onClick).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "gene",
        feature: expect.objectContaining({
          kind: "gene",
          start: 100,
          end: 200,
          transcripts: [firstTranscript, data[1]],
        }),
      }),
      geneTrack,
    );

    expect(await mounted.hover(hitTarget)).toBe("gene1Locationchr1:101–200Strand-Transcripts2");
    expect(interaction.onHover).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "gene", feature: expect.objectContaining({ kind: "gene" }) }),
      geneTrack,
    );
    expect(await leave(mounted, hitTarget)).toBe("");
    expect(interaction.onLeave).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "gene", feature: expect.objectContaining({ kind: "gene" }) }),
      geneTrack,
    );
  });

  it("repaints composite genes in a new track color", async () => {
    const mounted = await render("merged");

    await recolor(mounted, "#123456");
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("fill")).toBe("#123456");
  });

  it("keeps the tag color on transcripts when the track color changes", async () => {
    const mounted = await render("full");

    await recolor(mounted, "#123456");
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("fill")).toBe("#d45c2f");
  });

  it("filters by configured tags and uses the first matching tag color", async () => {
    const nearMatch = transcript("tx4", "gene3", 400, 450, { tags: ["MANE_Select_v2"] });
    const ensemblCanonical = transcript("tx5", "gene4", 410, 460, {
      tags: ["Ensembl_canonical", "basic"],
    });
    await render("tagged", {
      config: {
        ...config,
        tagColors: [
          { tag: "basic", color: "#112233" },
          { tag: "Ensembl_canonical", color: "#445566" },
        ],
      },
      data: [...data, nearMatch, ensemblCanonical],
    });

    expect(
      Array.from(container.querySelectorAll("[data-gene-label]")).map((label) => label.textContent),
    ).toEqual(["tx5"]);
    expect(container.querySelector('[data-gene-part="cds"]')?.getAttribute("fill")).toBe("#112233");
  });

  it("renders no tagged transcripts when no tags are configured", async () => {
    await render("tagged", { config: { ...config, tagColors: [] } });

    expect(container.querySelectorAll("[data-gene-label]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-transcript-hit-target]")).toHaveLength(0);
  });
});

async function render(
  display: "full" | "merged" | "tagged",
  options: {
    config?: GeneCreateInput["config"];
    data?: GeneData;
    visibleRegion?: { chromosome: string; start: number; end: number };
  } = {},
) {
  view = await mountTrack({
    module: geneModule,
    track: {
      // Starts off the laid-out height, so the height checks need the row layout to run.
      base: { id: "genes", title: "Genes", color, height: 99, display },
      config: options.config ?? config,
    },
    interaction,
    data: options.data ?? data,
    region,
    visibleRegion: options.visibleRegion,
    width: 500,
  });
  container = view.content;
  return view;
}

function trackHeight(mounted: MountedTrack) {
  return mounted.trackStore.getState().getTrack("genes")?.base.height;
}

async function recolor(mounted: MountedTrack, next: string) {
  await mounted.settle(() =>
    mounted.trackStore.getState().updateTrack("genes", { base: { color: next } }),
  );
  container = mounted.content;
}

/** Moves the pointer off a target and returns the tooltip text left showing. */
async function leave(mounted: MountedTrack, target: Element) {
  await mounted.settle(() => target.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
  return document.querySelector("[data-genomebrowser-tooltip-overlay]")?.textContent ?? "";
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
    tags?: string[];
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
    transcriptName: transcriptId,
    geneId,
    geneName: geneId,
    tags: options.tags ?? [],
    attributes: {},
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
      tags: options.tags?.join(",") ?? "",
      attributes: "{}",
      fields: [],
    },
  };
}
