// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  type TrackMutationResult,
} from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";
import { caveModule } from "@weng-lab/genomebrowser-tracks/cave";
import { methylCModule, type MethylCUrls } from "@weng-lab/genomebrowser-tracks/methylc";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("first-party fetch-on-change behavior", () => {
  it("refetches source changes but not visual or dataset-label changes", async () => {
    const bigWigFetch = vi.fn(async () => []);
    const bulkBedFetch = vi.fn(async () => [[]]);
    const caveFetch = vi.fn(async () => ({ top: [], bottom: [] }));
    const methylCFetch = vi.fn(async () => Array.from({ length: 8 }, () => []));
    const modules = [
      { ...bigWigModule, fetch: bigWigFetch },
      { ...bulkBedModule, fetch: bulkBedFetch },
      { ...caveModule, fetch: caveFetch },
      { ...methylCModule, fetch: methylCFetch },
    ];
    const urls = createMethylCUrls("METHYL_A");
    const useTrackStore = createTrackStore({
      modules,
      tracks: [
        bigWigModule.create({
          id: "bigwig",
          title: "BigWig",
          config: { url: "BIGWIG_A" },
        }),
        bulkBedModule.create({
          id: "bulkbed",
          title: "BulkBed",
          config: { datasets: [{ name: "Dataset A", url: "BULKBED_A" }] },
        }),
        caveModule.create({
          id: "cave",
          title: "CAVE",
          config: { neurotransmitter: "GABA", age: "Adulthood" },
        }),
        methylCModule.create({
          id: "methylc",
          title: "MethylC",
          config: { urls },
        }),
      ],
    });
    const useBrowserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1_000 } },
      region: { chromosome: "chr1", start: 100, end: 200 },
      trackWidth: 100,
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await settle(async () => {
      root?.render(<GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />);
    });

    expectFetchCounts([bigWigFetch, bulkBedFetch, caveFetch, methylCFetch], [1, 1, 1, 1]);

    await settle(() => {
      expectOk(
        useTrackStore.getState().updateTrack("bigwig", {
          config: { showClampIndicators: false, clampIndicatorColor: "#123456" },
        }),
      );
      expectOk(
        useTrackStore.getState().updateTrack("bulkbed", {
          config: { datasets: [{ name: "Renamed dataset", url: "BULKBED_A" }], gap: 5 },
        }),
      );
      expectOk(
        useTrackStore.getState().updateTrack("cave", {
          config: { topColor: "#123456", bottomColor: "#654321" },
        }),
      );
      expectOk(
        useTrackStore.getState().updateTrack("methylc", {
          config: {
            colors: {
              cpg: "#000000",
              chg: "#ff944d",
              chh: "#ff00ff",
              depth: "#525252",
            },
          },
        }),
      );
    });

    expectFetchCounts([bigWigFetch, bulkBedFetch, caveFetch, methylCFetch], [1, 1, 1, 1]);

    await settle(() => {
      expectOk(useTrackStore.getState().updateTrack("bigwig", { config: { url: "BIGWIG_B" } }));
    });
    expectFetchCounts([bigWigFetch, bulkBedFetch, caveFetch, methylCFetch], [2, 1, 1, 1]);

    await settle(() => {
      expectOk(
        useTrackStore.getState().updateTrack("bulkbed", {
          config: { datasets: [{ name: "Renamed dataset", url: "BULKBED_B" }] },
        }),
      );
    });
    expectFetchCounts([bigWigFetch, bulkBedFetch, caveFetch, methylCFetch], [2, 2, 1, 1]);

    await settle(() => {
      expectOk(useTrackStore.getState().updateTrack("cave", { config: { age: "Adolescence" } }));
    });
    expectFetchCounts([bigWigFetch, bulkBedFetch, caveFetch, methylCFetch], [2, 2, 2, 1]);

    await settle(() => {
      expectOk(
        useTrackStore.getState().updateTrack("cave", { config: { neurotransmitter: "GLU" } }),
      );
    });
    expectFetchCounts([bigWigFetch, bulkBedFetch, caveFetch, methylCFetch], [2, 2, 3, 1]);

    await settle(() => {
      expectOk(
        useTrackStore.getState().updateTrack("methylc", {
          config: {
            urls: {
              ...urls,
              plusStrand: { ...urls.plusStrand, cpg: { url: "METHYL_B" } },
            },
          },
        }),
      );
    });
    expectFetchCounts([bigWigFetch, bulkBedFetch, caveFetch, methylCFetch], [2, 2, 3, 2]);
  });
});

async function settle(update: () => void | Promise<void>) {
  await act(async () => {
    await update();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function expectOk(result: TrackMutationResult) {
  expect(result).toEqual({ ok: true });
}

function expectFetchCounts(fetches: Array<ReturnType<typeof vi.fn>>, counts: number[]) {
  fetches.forEach((fetch, index) => expect(fetch).toHaveBeenCalledTimes(counts[index]));
}

function createMethylCUrls(url: string): MethylCUrls {
  const strand = {
    cpg: { url },
    chg: { url },
    chh: { url },
    depth: { url },
  };
  return { plusStrand: strand, minusStrand: strand };
}
