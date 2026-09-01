// @vitest-environment jsdom

import type { TrackRuntimeContext } from "@weng-lab/genomebrowser";
import type { CaveConfig } from "@weng-lab/genomebrowser-tracks/cave";
import type {
  GeneConfig,
  GeneInteractionTarget,
  GeneTranscript,
} from "@weng-lab/genomebrowser-tracks/gene";
import type {
  MethylCConfig,
  MethylCShowRows,
  MethylCTooltipItem,
} from "@weng-lab/genomebrowser-tracks/methylc";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BigBedTooltip } from "../../src/bigbed/tooltip";
import { BigWigTooltip } from "../../src/bigwig/tooltip";
import { BulkBedTooltip } from "../../src/bulkbed/tooltip";
import { CaveTooltip } from "../../src/cave/tooltip";
import { GeneTooltip } from "../../src/gene/tooltip";
import { MethylCTooltip } from "../../src/methylc/tooltip";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const methylCConfig: MethylCConfig = {
  urls: {
    plusStrand: {
      cpg: { url: "PLUS_CPG_URL" },
      chg: { url: "" },
      chh: { url: "PLUS_CHH_URL" },
      depth: { url: "" },
    },
    minusStrand: {
      cpg: { url: "" },
      chg: { url: "" },
      chh: { url: "" },
      depth: { url: "MINUS_DEPTH_URL" },
    },
  },
  colors: {
    cpg: "#648bd8",
    chg: "#ff944d",
    chh: "#ff00ff",
    depth: "#525252",
  },
  maskCpgByCoverage: false,
};

const methylCShowRows: MethylCShowRows = {
  fwdCpg: true,
  fwdChg: false,
  fwdChh: true,
  fwdDepth: false,
  revCpg: false,
  revChg: false,
  revChh: false,
  revDepth: true,
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let getBBoxDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  getBBoxDescriptor = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 140, height: 20 }),
  });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;

  if (getBBoxDescriptor) {
    Object.defineProperty(SVGElement.prototype, "getBBox", getBBoxDescriptor);
  } else {
    delete (SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox;
  }
});

describe("track tooltips", () => {
  it("shows genomic reader chromosome coordinates for BigBed tracks", () => {
    mount(
      <BigBedTooltip
        item={{ chromosome: "chr1", start: 10, end: 20, fields: [] }}
        context={context("bigbed", { url: "YOUR_URL_HERE", rowHeight: 12 })}
      />,
    );

    expect(tooltipText()).toEqual(["Location", "chr1:10–20"]);
  });

  it("shows genomic reader chromosome coordinates for bulk BigBed tracks", () => {
    mount(
      <BulkBedTooltip
        item={{
          chromosome: "chr2",
          start: 30,
          end: 40,
          fields: [],
          datasetName: "Sample",
        }}
        context={context("bulkbed", {
          datasets: [{ name: "Sample", url: "YOUR_URL_HERE" }],
          rowHeight: 12,
        })}
      />,
    );

    expect(tooltipText()).toEqual(["Sample", "Location", "chr2:30–40"]);
  });

  it("shows both the transcript name and identifier", () => {
    const feature = geneTranscript();
    mount(
      <GeneTooltip
        item={{ kind: "transcript", feature }}
        context={context<GeneConfig>("gene", {
          url: "YOUR_URL_HERE",
          tagColors: [],
          highlightColor: "#000000",
          rowHeight: 12,
        })}
      />,
    );

    expect(tooltipText()).toEqual([
      "GENE1",
      "Location",
      "chr1:100–180",
      "Strand",
      "+",
      "Transcript Name",
      "Isoform 1",
      "Transcript ID",
      "tx1",
    ]);
  });

  it("shows compact typed gene-part details", () => {
    const feature = geneTranscript();
    const item: GeneInteractionTarget = {
      kind: "part",
      feature,
      part: {
        kind: "intron",
        start: 120,
        end: 150,
        metadata: { intronIndex: 0, transcriptionIndex: 0 },
        source: "transcript",
      },
    };
    mount(
      <GeneTooltip
        item={item}
        context={context<GeneConfig>("gene", {
          url: "YOUR_URL_HERE",
          tagColors: [],
          highlightColor: "#000000",
          rowHeight: 12,
        })}
      />,
    );

    expect(tooltipText()).toEqual([
      "GENE1",
      "Part",
      "Intron",
      "Location",
      "chr1:120–150",
      "Length",
      "30 bp",
      "Transcript Name",
      "Isoform 1",
      "Transcript ID",
      "tx1",
      "Intron",
      "1 of 1",
    ]);
  });

  it("summarizes support and conflicts for a merged gene part", () => {
    const transcript = geneTranscript();
    const secondTranscript = {
      ...transcript,
      transcriptId: "tx2",
      transcriptName: "Isoform 2",
    };
    const item: GeneInteractionTarget = {
      kind: "part",
      feature: {
        kind: "gene",
        chromosome: transcript.chromosome,
        start: transcript.start,
        end: transcript.end,
        strand: transcript.strand,
        geneId: transcript.geneId,
        geneName: transcript.geneName,
        transcripts: [transcript, secondTranscript],
      },
      part: {
        kind: "cds",
        start: 100,
        end: 120,
        source: "merged",
        metadata: {
          winningContributions: [
            { transcriptId: "tx1", kind: "cds", utrSide: null },
            { transcriptId: "tx2", kind: "cds", utrSide: null },
          ],
          overriddenContributions: [{ transcriptId: "tx3", kind: "utr", utrSide: "5-prime" }],
          utrSides: [],
        },
      },
    };
    mount(
      <GeneTooltip
        item={item}
        context={context<GeneConfig>("gene", {
          url: "YOUR_URL_HERE",
          tagColors: [],
          highlightColor: "#000000",
          rowHeight: 12,
        })}
      />,
    );

    expect(tooltipText()).toEqual([
      "GENE1",
      "Part",
      "CDS",
      "Location",
      "chr1:100–120",
      "Length",
      "20 bp",
      "Supported by",
      "Isoform 1, Isoform 2",
      "Also called",
      "UTR",
    ]);
  });

  it("always renders exactly one BigWig signal row from item.max", () => {
    const rerender = mount(
      <BigWigTooltip
        item={{ x: 0, min: -8, max: 5.75 }}
        context={context("bigwig", {
          url: "YOUR_URL_HERE",
          fillWithZero: false,
          showClampIndicators: true,
          clampIndicatorColor: "#ff0000",
        })}
      />,
    );

    expect(tooltipText()).toEqual(["Signal", "5.75"]);

    rerender(
      <BigWigTooltip
        item={{ x: 0, min: null, max: null }}
        context={context("bigwig", {
          url: "YOUR_URL_HERE",
          fillWithZero: false,
          showClampIndicators: true,
          clampIndicatorColor: "#ff0000",
        })}
      />,
    );

    expect(tooltipText()).toEqual(["Signal", "No data"]);
    expect(container?.textContent).not.toContain("Range");
  });

  it("preserves both CAVE rows, uses no-data text, and decorates each configured color", () => {
    const config: CaveConfig = {
      age: "Adulthood",
      neurotransmitter: "GABA",
      topColor: "#aabbcc",
      bottomColor: "#112233",
    };
    mount(
      <CaveTooltip
        item={{
          x: 0,
          top: { x: 0, min: null, max: null },
          bottom: { x: 0, min: null, max: null },
        }}
        context={context("cave", config)}
      />,
    );

    expect(tooltipText()).toEqual(["hmC", "No data", "OXBS", "No data"]);
    expectColorTreatment("#aabbcc");
    expectColorTreatment("#112233");
  });

  it("keeps configured methylC rows and order stable across data and no-data regions", () => {
    const rerender = mount(
      <MethylCTooltip
        item={methylCItem([1.25, null, 2.5, null, null, null, null, 18])}
        context={context("methylc", methylCConfig)}
      />,
    );

    expect(tooltipText()).toEqual(["Plus CpG", "1.25", "Plus CHH", "2.50", "Minus depth", "18.00"]);

    rerender(
      <MethylCTooltip
        item={methylCItem([null, null, Number.NaN, null, null, null, null, null])}
        context={context("methylc", methylCConfig)}
      />,
    );

    expect(tooltipText()).toEqual([
      "Plus CpG",
      "No data",
      "Plus CHH",
      "No data",
      "Minus depth",
      "No data",
    ]);
    expectColorTreatment(methylCConfig.colors.cpg);
    expectColorTreatment(methylCConfig.colors.chh);
    expectColorTreatment(methylCConfig.colors.depth);
  });

  it("shows an explicit methylC empty state when every channel is disabled", () => {
    const showRows = Object.fromEntries(
      Object.keys(methylCShowRows).map((key) => [key, false]),
    ) as MethylCShowRows;
    mount(
      <MethylCTooltip
        item={{ tooltipValues: [], showRows }}
        context={context("methylc", methylCConfig)}
      />,
    );

    expect(tooltipText()).toEqual(["Channels", "None enabled"]);
  });
});

function context<Config>(type: string, config: Config): TrackRuntimeContext<Config> {
  return {
    type,
    base: { id: type, title: type, display: "full", height: 40, color: "#000000" },
    config: config as Config extends object ? Readonly<Config> : Config,
  };
}

function methylCItem(values: (number | null)[]): MethylCTooltipItem {
  return {
    showRows: methylCShowRows,
    tooltipValues: values.map((max, x) => ({ x, min: max, max })),
  };
}

function geneTranscript(): GeneTranscript {
  return {
    kind: "transcript",
    chromosome: "chr1",
    start: 100,
    end: 180,
    strand: "+",
    transcriptId: "tx1",
    transcriptName: "Isoform 1",
    geneId: "gene1",
    geneName: "GENE1",
    tags: [],
    attributes: {},
    exons: [
      { start: 100, end: 120, frame: 0 },
      { start: 150, end: 180, frame: 1 },
    ],
    source: {
      chromosome: "chr1",
      start: 100,
      end: 180,
      name: "tx1",
      score: 0,
      strand: "+",
      thickStart: 100,
      thickEnd: 180,
      reserved: "0",
      blockCount: 2,
      blockSizes: [20, 30],
      chromStarts: [0, 50],
      name2: "tx1",
      cdsStartStat: "cmpl",
      cdsEndStat: "cmpl",
      exonFrames: [0, 1],
      type: "coding",
      geneName: "gene1",
      geneName2: "GENE1",
      geneType: "protein_coding",
      fields: [],
    },
  };
}

function mount(node: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  const rerender = (nextNode: ReactNode) => {
    act(() => root?.render(<svg>{nextNode}</svg>));
  };

  rerender(node);
  return rerender;
}

function tooltipText() {
  return Array.from(container?.querySelectorAll('[role="tooltip"] text') ?? []).map(
    (element) => element.textContent,
  );
}

function expectColorTreatment(color: string) {
  const decorations = Array.from(container?.querySelectorAll('[role="tooltip"] rect') ?? []).filter(
    (element) => element.getAttribute("fill") === color,
  );

  expect(decorations).toHaveLength(2);
  expect(decorations.some((element) => element.hasAttribute("fill-opacity"))).toBe(true);
  expect(decorations.some((element) => !element.hasAttribute("fill-opacity"))).toBe(true);
}
