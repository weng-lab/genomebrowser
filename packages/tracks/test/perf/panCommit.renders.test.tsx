// @vitest-environment jsdom

import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  type AnyTrackModule,
} from "@weng-lab/genomebrowser";
import { bigBedModule, type BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";
import { geneModule, type GeneTranscript } from "@weng-lab/genomebrowser-tracks/gene";
import { methylCModule } from "@weng-lab/genomebrowser-tracks/methylc";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import type { BigWigRecord } from "@weng-lab/genomic-reader";
import { afterEach, describe, expect, it } from "vitest";

// Work done when committing a pan that stays inside the loaded data: no track fetches,
// but every row renders for the new visible region. Counts are deterministic, so they
// measure how much the commit does without timing noise.

const VIEW = { chromosome: "chr1", start: 1_000_000, end: 1_100_000 };
const PANNED = { chromosome: "chr1", start: 1_020_000, end: 1_120_000 };
// Data covers the overscan window, one span beyond each side of the view.
const DATA_START = 900_000;
const DATA_END = 1_200_000;

let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  probe = undefined;
});

function random(seed: number) {
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
}

function signal(seed: number, count = 1_500): BigWigRecord[] {
  const next = random(seed);
  const step = (DATA_END - DATA_START) / count;
  return Array.from({ length: count }, (_, index) => {
    const value = next() * 50;
    return {
      kind: "summary",
      chromosome: "chr1",
      start: DATA_START + index * step,
      end: DATA_START + (index + 1) * step,
      validCount: 1,
      min: value / 2,
      max: value,
      sum: value,
      sumSquares: value * value,
      mean: value * 0.75,
    };
  });
}

function beds(seed: number, count = 300): BigBedRow[] {
  const next = random(seed);
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(DATA_START + next() * (DATA_END - DATA_START - 2_000));
    return {
      chromosome: "chr1",
      start,
      end: start + 200 + Math.floor(next() * 1_500),
      name: `feature${index}`,
      score: 0,
      strand: "+",
      color: "#336699",
      fields: [],
    };
  });
}

function genes(count = 150): GeneTranscript[] {
  const next = random(7);
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(DATA_START + next() * (DATA_END - DATA_START - 20_000));
    const exons = Array.from({ length: 8 }, (_, exon) => ({
      start: start + exon * 2_000,
      end: start + exon * 2_000 + 400,
      frame: 0 as const,
    }));
    const end = exons.at(-1)!.end;
    const id = `tx${index}`;
    return {
      kind: "transcript",
      chromosome: "chr1",
      start,
      end,
      strand: index % 2 ? "-" : "+",
      transcriptId: id,
      transcriptName: id,
      geneId: `gene${index}`,
      geneName: `GENE${index}`,
      tags: [],
      attributes: {},
      exons,
      source: {
        chromosome: "chr1",
        start,
        end,
        name: id,
        score: 0,
        strand: index % 2 ? "-" : "+",
        thickStart: start,
        thickEnd: end,
        reserved: "0",
        blockCount: exons.length,
        blockSizes: exons.map((exon) => exon.end - exon.start),
        chromStarts: exons.map((exon) => exon.start - start),
        name2: id,
        cdsStartStat: "cmpl",
        cdsEndStat: "cmpl",
        exonFrames: exons.map((exon) => exon.frame),
        type: "coding",
        geneName: `gene${index}`,
        geneName2: `GENE${index}`,
        geneType: "protein_coding",
        tags: "",
        attributes: "{}",
        fields: [],
      },
    };
  });
}

function withData<Module extends AnyTrackModule>(module: Module, data: unknown): Module {
  return { ...module, fetch: async () => data };
}

const methylUrls = (url: string) => ({ cpg: { url }, chg: { url }, chh: { url }, depth: { url } });

async function mountBrowser() {
  const modules = [
    withData(rulerModule, { records: [] }),
    withData(bigWigModule, signal(1)),
    withData(bigBedModule, beds(2)),
    withData(geneModule, genes()),
    withData(bulkBedModule, [beds(3, 200), beds(4, 200), beds(5, 200)]),
    withData(
      methylCModule,
      Array.from({ length: 8 }, (_, index) => signal(10 + index)),
    ),
    withData(caveModule, { top: signal(20), bottom: signal(21) }),
  ];
  const trackStore = createTrackStore({
    modules,
    tracks: [
      rulerModule.create({ base: { id: "ruler", title: "Ruler" }, config: {} }),
      bigWigModule.create({
        base: { id: "bigwig", title: "BigWig" },
        config: { url: "YOUR_URL_HERE" },
      }),
      bigBedModule.create({
        base: { id: "bigbed", title: "BigBed" },
        config: { url: "YOUR_URL_HERE" },
      }),
      geneModule.create({ base: { id: "gene", title: "Genes" }, config: { url: "YOUR_URL_HERE" } }),
      bulkBedModule.create({
        base: { id: "bulkbed", title: "Bulk" },
        config: {
          datasets: [1, 2, 3].map((index) => ({ name: `D${index}`, url: "YOUR_URL_HERE" })),
        },
      }),
      methylCModule.create({
        base: { id: "methylc", title: "MethylC" },
        config: {
          urls: {
            plusStrand: methylUrls("YOUR_URL_HERE"),
            minusStrand: methylUrls("YOUR_URL_HERE"),
          },
        },
      }),
      caveModule.create({
        base: { id: "cave", title: "CAVE" },
        config: { neurotransmitter: "GABA", age: "Adulthood" },
      }),
    ],
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000_000 } },
    region: VIEW,
    trackWidth: 1_000,
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  return { probe, browserStore };
}

/** Commits a pan inside the loaded data and counts the resulting renders and DOM writes. */
async function measurePanCommit() {
  const { probe, browserStore } = await mountBrowser();
  const svg = document.querySelector("#browserSVG");
  if (!svg) throw new Error("Expected the browser SVG");
  let mutations = 0;
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      mutations +=
        record.type === "childList" ? record.addedNodes.length + record.removedNodes.length : 1;
    }
  });
  observer.observe(svg, { subtree: true, childList: true, attributes: true, characterData: true });
  const report = await probe.measure(() => browserStore.getState().setRegion(PANNED));
  for (const record of observer.takeRecords()) {
    mutations +=
      record.type === "childList" ? record.addedNodes.length + record.removedNodes.length : 1;
  }
  observer.disconnect();
  const renders = Object.values(report.counts).reduce((total, count) => total + count, 0);
  return { renders, mutations, counts: report.counts };
}

describe("pan commit inside loaded data", () => {
  it("renders and writes only what the new visible region changes", async () => {
    const result = await measurePanCommit();

    // Budget: a higher number fails. Gene transcripts keep their glyphs, labels, and hit
    // targets across the pan; re-packed rows move by transform instead of remounting.
    expect({ renders: result.renders, mutations: result.mutations }).toMatchInlineSnapshot(`
      {
        "mutations": 93,
        "renders": 163,
      }
    `);
  });
});
