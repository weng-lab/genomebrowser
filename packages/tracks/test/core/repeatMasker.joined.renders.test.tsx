// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createBrowserStore, createTrackStore, GenomeBrowser } from "@weng-lab/genomebrowser";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { repeatMaskerModule as module } from "@weng-lab/genomebrowser-tracks/repeatmasker";
import { sources } from "../fixtures/repeatMasker";
import { joinedRepeatColumns, serveBigRmsk, singleRepeatFile } from "../fixtures/bigRmsk";

let probe: Probe | undefined;
afterEach(() => {
  probe?.unmount();
  vi.unstubAllGlobals();
});

it("budgets presentation changes and label-only updates without re-reading the file and preserves typed click targets", async () => {
  const fetch = serveBigRmsk(singleRepeatFile(joinedRepeatColumns));
  const onClick = vi.fn();
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 100, end: 200 },
    trackWidth: 1000,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: [
      module.create(
        {
          base: { id: "repeats", title: "RepeatMasker", display: "pack" },
          config: {
            sources: { ...sources, joined: "https://users.wenglab.org/niship/bigRmskExample.bb" },
            view: "joined",
          },
        },
        { onClick },
      ),
    ],
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  expect(document.querySelectorAll("[data-bigrmsk-block]")).toHaveLength(2);
  expect(document.querySelector("[data-bigrmsk-label]")?.textContent).toBe("L1");
  const requestCount = fetch.mock.calls.length;
  // updateTrack changes label visibility. Both components must render the new config once;
  // the unchanged row count needs no height update or second render.
  const labels = await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { config: { showLabels: false } }),
  );
  expect(labels.pick("PackedBigRmsk", "RepeatRows")).toMatchInlineSnapshot(`
    {
      "PackedBigRmsk": 1,
      "RepeatRows": 1,
    }
  `);
  expect(document.querySelector("[data-bigrmsk-label]")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(requestCount);
  // updateTrack replaces the packed renderer with the full renderer; each mounts once.
  const display = await probe.measure(() =>
    trackStore.getState().updateTrack("repeats", { base: { display: "full" } }),
  );
  expect(display.pick("FullBigRmsk", "RepeatRows")).toMatchInlineSnapshot(`
    {
      "FullBigRmsk": 1,
      "RepeatRows": 1,
    }
  `);
  expect(document.querySelectorAll("[data-bigrmsk-context]")).toHaveLength(2);
  await probe.measure(() => {
    document
      .querySelector("[data-bigrmsk-repeat]")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onClick).toHaveBeenCalledWith(
    expect.objectContaining({
      repeatName: "L1",
      repeatClass: "LINE",
      blockSizes: [10, 20, -5, 20, 30],
    }),
    expect.objectContaining({
      type: "repeatmasker",
      base: expect.objectContaining({ display: "full" }),
    }),
  );
});
