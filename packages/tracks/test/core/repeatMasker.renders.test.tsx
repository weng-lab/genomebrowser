// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { repeatMaskerModule as module } from "@weng-lab/genomebrowser-tracks/repeatmasker";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { serveRepeatMasker, sources } from "../fixtures/repeatMasker";
let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  vi.unstubAllGlobals();
});
it("budgets visual settings and view switches without losing display, callbacks, or source-specific settings", async () => {
  const fetch = serveRepeatMasker(),
    onClick = vi.fn();
  const browserStore = createBrowserStore({
    assembly: { id: "hg38", chromosomes: { chr1: 248956422 } },
    region: { chromosome: "chr1", start: 0, end: 3000 },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [
      module.create(
        { base: { id: "repeats", title: "RepeatMasker", display: "pack" }, config: { sources } },
        { onClick },
      ),
    ],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  expect(document.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
  const count = fetch.mock.calls.length;
  // The wrapper and standard renderer each show the new visual configuration once.
  // Data and row count stay fixed, so there is no request or height update.
  const visual = await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", {
      config: { showLabels: false, showStrandArrows: false, highlightClassOnHover: false },
    }),
  );
  expect(
    visual.pick(
      "PackedRepeatMasker",
      "RepeatMaskerRows",
      "PackedStandardRepeatMasker",
      "RepeatRows",
    ),
  ).toMatchInlineSnapshot(`
    {
      "PackedRepeatMasker": 1,
      "PackedStandardRepeatMasker": 1,
      "RepeatMaskerRows": 1,
      "RepeatRows": 1,
    }
  `);
  expect(document.querySelector("[data-repeatmasker-label]")).toBeNull();
  expect(
    document.querySelector("[data-repeatmasker-arrows]")?.getAttribute("data-repeatmasker-arrows"),
  ).toBe("false");
  expect(fetch).toHaveBeenCalledTimes(count);
  await probe.measure(() =>
    document
      .querySelector("[data-repeatmasker-repeat]")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(onClick).toHaveBeenLastCalledWith(
    expect.objectContaining({ repClass: "SINE", swScore: 2500 }),
    expect.objectContaining({
      type: "repeatmasker",
      config: expect.objectContaining({ view: "standard", showLabels: false }),
    }),
  );
  // Source replacement mounts the joined renderer, then the row layout commits
  // its smaller height. These commits show changed data or layout.
  const switched = await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { config: { view: "joined" } }),
  );
  expect(switched.pick("PackedRepeatMasker", "RepeatMaskerRows", "PackedBigRmsk", "RepeatRows"))
    .toMatchInlineSnapshot(`
    {
      "PackedBigRmsk": 2,
      "PackedRepeatMasker": 2,
      "RepeatMaskerRows": 2,
      "RepeatRows": 2,
    }
  `);
  expect(document.querySelector("[data-repeatmasker-block]")).toBeNull();
  expect(document.querySelectorAll("[data-bigrmsk-block]")).toHaveLength(2);
  expect(document.querySelector("[data-bigrmsk-label]")).toBeNull();
  await probe.measure(() =>
    document
      .querySelector("[data-bigrmsk-repeat]")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(onClick).toHaveBeenLastCalledWith(
    expect.objectContaining({ repeatClass: "LINE", blockSizes: [10, 20, -5, 20, 30] }),
    expect.objectContaining({
      type: "repeatmasker",
      base: expect.objectContaining({ display: "pack" }),
      config: expect.objectContaining({ view: "joined" }),
    }),
  );
  await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { config: { view: "standard" } }),
  );
  expect(document.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
  expect(trackStore.getState().getTrack("repeats")).toMatchObject({
    base: { display: "pack" },
    config: {
      showLabels: false,
      showStrandArrows: false,
      highlightClassOnHover: false,
      showUnalignedExtents: true,
    },
  });
  // Switching from Pack to Dense mounts the coverage renderer, then row layout
  // commits the one-row height. Each commit displays a new mode or layout.
  const dense = await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { base: { display: "dense" } }),
  );
  expect(
    dense.pick("DenseRepeatMasker", "RepeatMaskerRows", "DenseStandardRepeatMasker", "RepeatRows"),
  ).toMatchInlineSnapshot(`
    {
      "DenseRepeatMasker": 2,
      "DenseStandardRepeatMasker": 2,
      "RepeatMaskerRows": 2,
      "RepeatRows": 2,
    }
  `);
  const coverage = document.querySelectorAll("[data-repeatmasker-summary]");
  expect(coverage.length).toBeGreaterThan(1);
  await probe.measure(() => coverage[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(onClick).toHaveBeenLastCalledWith(
    expect.objectContaining({ kind: "summary", mean: 2 }),
    expect.objectContaining({
      type: "repeatmasker",
      base: expect.objectContaining({ display: "dense" }),
    }),
  );
});

it("cancels a pending source switch and ignores its late response", async () => {
  const network = serveRepeatMasker();
  let resolve!: () => void;
  const release = {
    promise: new Promise<void>((done) => {
      resolve = done;
    }),
    resolve: () => resolve(),
  };
  const pending: AbortSignal[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === sources.joined) {
      if (init?.signal) pending.push(init.signal);
      await release.promise;
    }
    return network(input, init);
  });
  const browserStore = createBrowserStore({
    assembly: { id: "hg38", chromosomes: { chr1: 248956422 } },
    region: { chromosome: "chr1", start: 0, end: 3000 },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [
      module.create({
        base: { id: "repeats", title: "RepeatMasker", display: "pack" },
        config: { sources },
      }),
    ],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { config: { view: "joined" } }),
  );
  expect(pending.length).toBeGreaterThan(0);
  await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { config: { view: "standard" } }),
  );
  expect(pending.every((signal) => signal.aborted)).toBe(true);
  await probe.measure(() => release.resolve());
  expect(document.querySelectorAll("[data-repeatmasker-block]")).toHaveLength(11);
  expect(document.querySelector("[data-bigrmsk-block]")).toBeNull();
});
