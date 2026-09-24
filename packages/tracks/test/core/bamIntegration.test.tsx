// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import {
  bamModule,
  type BamRecord,
  type BamConfig,
  type BamData,
} from "@weng-lab/genomebrowser-tracks/bam";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});
const records: BamRecord[] = [100, 120, 180].map((start, i) => ({
  chromosome: "chr1",
  start,
  end: start + 30,
  readName: "read" + i,
  strand: i === 1 ? "-" : "+",
  flags: i === 1 ? 16 : 0,
  mappingQuality: 60,
  sequence: "A".repeat(30),
  phredQualities: Array(30).fill(30),
  cigar: [{ op: "M", length: 30, sequenceOffset: 0, referenceOffset: 0 }],
  mate: null,
  templateLength: 0,
}));
async function settle(action: () => void) {
  await act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}
describe("BAM hosted track", () => {
  it("switches displays, derives height, delivers interactions, and refetches only fetch-affecting settings", async () => {
    const fetch = vi.fn(async (): Promise<BamData> => ({ records, reference: [] }));
    const click = vi.fn();
    const useTrackStore = createTrackStore({
      modules: [{ ...bamModule, fetch }],
      tracks: [
        bamModule.create(
          {
            base: { id: "bam", title: "BAM", display: "full" },
            config: { url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" },
          },
          { onClick: click },
        ),
      ],
    });
    const useBrowserStore = createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 1000 } },
      region: { chromosome: "chr1", start: 100, end: 220 },
      trackWidth: 1000,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await settle(() =>
      root?.render(
        <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
      ),
    );
    expect(container.querySelectorAll("[data-bam-read]")).toHaveLength(3);
    expect(useTrackStore.getState().getTrack("bam")?.base.height).toBe(42);
    await settle(() =>
      container!
        .querySelector("[data-bam-read]")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(click.mock.calls[0][0]).toEqual(records[0]);
    for (const [display, height] of [
      ["dense", 14],
      ["squish", 14],
      ["pack", 28],
      ["full", 42],
    ] as const) {
      await settle(() => {
        useTrackStore.getState().updateTrack("bam", { base: { display } });
      });
      expect(container.querySelector("[data-bam-display]")?.getAttribute("data-bam-display")).toBe(
        display,
      );
      expect(useTrackStore.getState().getTrack("bam")?.base.height).toBe(height);
    }
    // Core may refetch display changes; capture the baseline before render-only settings.
    const baseline = fetch.mock.calls.length;
    await settle(() => {
      useTrackStore.getState().updateTrack("bam", {
        config: {
          reverseColor: "#aa0000",
          minimumMappingQuality: 20,
          showDuplicates: false,
          rowHeight: 16,
        },
      });
    });
    expect(fetch).toHaveBeenCalledTimes(baseline);
    expect(useTrackStore.getState().getTrack("bam")?.base.height).toBe(48);
    const updates: Partial<BamConfig>[] = [
      { indexUrl: "SECOND_INDEX" },
      { url: "SECOND_BAM" },
      { maxWindow: 100000 },
      { sequenceUrl: "https://example.test/reference.2bit" },
    ];
    for (const config of updates) {
      const before = fetch.mock.calls.length;
      await settle(() => {
        expect(useTrackStore.getState().updateTrack("bam", { config }).ok).toBe(true);
      });
      expect(fetch).toHaveBeenCalledTimes(before + 1);
    }
  });
});
