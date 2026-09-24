// @vitest-environment jsdom

import { renderWithProbe, type Probe, type RenderReport } from "@weng-lab/render-probe";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

// Render budgets: exact committed render counts for common interactions. A higher
// number fails the test. Accept a lower one with `vitest -u` after confirming it.
// See .agents/skills/verify-renders/SKILL.md.

function TestRenderer({ color }: { color: string }) {
  return <rect fill={color} />;
}

const module = defineTrackModule({
  type: "render-budget-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: TestRenderer },
});

let probe: Probe | undefined;

afterEach(() => {
  probe?.unmount();
  probe = undefined;
});

async function mountBrowser() {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 0, end: 1_000 },
    marginWidth: 100,
    trackWidth: 1_000,
    titleSize: 10,
  });
  const trackStore = createTrackStore({
    modules: [module],
    tracks: ["first", "second", "third"].map(createTrack),
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );
  return { probe, browserStore, trackStore };
}

function createTrack(id: string) {
  return module.create({ base: { id, title: id, height: 20 }, config: {} });
}

/**
 * The components whose counts the budgets track. Each row has two `PanTrack`s (title
 * and content) and the browser has two `Highlights` layers, so their counts per
 * render are 2 per row and 2 per browser.
 */
function budget(report: RenderReport) {
  return report.pick(
    "GenomeBrowserRuntime",
    "BrowserView",
    "TrackStack",
    "ConnectedTrackRow",
    "TrackRow",
    "TrackFrame",
    "PanTrack",
    "TrackControls",
    "TrackContent",
    "TestRenderer",
    "Highlights",
  );
}

describe("GenomeBrowser render budgets with three tracks", () => {
  it("mounts", async () => {
    const { probe } = await mountBrowser();

    // Necessary: one render per instance, so 1 each for the runtime, view, and stack, 3
    // per row component, 6 PanTracks, and 2 Highlights. Mounting currently takes several
    // commits, re-rendering the whole tree while the fetch settles.
    expect(budget(probe.mounted)).toMatchInlineSnapshot(`
      {
        "BrowserView": 3,
        "ConnectedTrackRow": 9,
        "GenomeBrowserRuntime": 2,
        "Highlights": 6,
        "PanTrack": 18,
        "TestRenderer": 3,
        "TrackContent": 6,
        "TrackControls": 9,
        "TrackFrame": 9,
        "TrackRow": 9,
        "TrackStack": 3,
      }
    `);
  });

  it("commits a region change and settles the fetch", async () => {
    const { probe, browserStore } = await mountBrowser();

    const report = await probe.measure(() =>
      browserStore.getState().setRegion({ chromosome: "chr1", start: 500, end: 1_500 }),
    );

    // Necessary: every row and its renderer must render once for the new region, and
    // the view, stack, and both Highlights layers must reposition: 1 each for the view
    // and stack, 3 per row component, 6 PanTracks, and 2 Highlights. The runtime need
    // not render. The loading state also remounts each renderer before the fetch settles.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 3,
        "ConnectedTrackRow": 9,
        "GenomeBrowserRuntime": 2,
        "Highlights": 6,
        "PanTrack": 18,
        "TestRenderer": 6,
        "TrackContent": 9,
        "TrackControls": 9,
        "TrackFrame": 9,
        "TrackRow": 9,
        "TrackStack": 3,
      }
    `);
  });

  it("updates one track's color", async () => {
    const { probe, trackStore } = await mountBrowser();

    const report = await probe.measure(() =>
      trackStore.getState().updateTrack("second", { base: { color: "#ff0000" } }),
    );

    // Necessary: only the updated row renders, once per component. Nothing is wasted.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "ConnectedTrackRow": 1,
        "GenomeBrowserRuntime": 0,
        "Highlights": 0,
        "PanTrack": 2,
        "TestRenderer": 1,
        "TrackContent": 1,
        "TrackControls": 1,
        "TrackFrame": 1,
        "TrackRow": 1,
        "TrackStack": 0,
      }
    `);
  });

  it("adds a fourth track", async () => {
    const { probe, trackStore } = await mountBrowser();

    const report = await probe.measure(() => trackStore.getState().addTrack(createTrack("fourth")));

    // Necessary: the new row mounts once per component, and the view, stack, and
    // Highlights render once for the taller browser. The three existing rows do not
    // move and need not render.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 3,
        "ConnectedTrackRow": 12,
        "GenomeBrowserRuntime": 2,
        "Highlights": 6,
        "PanTrack": 24,
        "TestRenderer": 1,
        "TrackContent": 2,
        "TrackControls": 12,
        "TrackFrame": 12,
        "TrackRow": 12,
        "TrackStack": 3,
      }
    `);
  });

  it("adds a highlight", async () => {
    const { probe, browserStore } = await mountBrowser();

    const report = await probe.measure(() =>
      browserStore.getState().addHighlight({
        id: "highlight",
        region: { start: 600, end: 700 },
        color: "#00ff00",
      }),
    );

    // Necessary: only the two Highlights layers. Every row re-renders because the view
    // re-renders.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 3,
        "GenomeBrowserRuntime": 0,
        "Highlights": 2,
        "PanTrack": 6,
        "TestRenderer": 0,
        "TrackContent": 0,
        "TrackControls": 3,
        "TrackFrame": 3,
        "TrackRow": 3,
        "TrackStack": 1,
      }
    `);
  });

  it("pins a track", async () => {
    const { probe, trackStore } = await mountBrowser();

    const report = await probe.measure(() => trackStore.getState().setPinnedTrackIds(["third"]));

    // Necessary: the rows that move render once, and the pinned row's controls show its
    // new pin state. The view and stack render once for the new layout.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 3,
        "GenomeBrowserRuntime": 1,
        "Highlights": 2,
        "PanTrack": 6,
        "TestRenderer": 0,
        "TrackContent": 0,
        "TrackControls": 3,
        "TrackFrame": 3,
        "TrackRow": 3,
        "TrackStack": 1,
      }
    `);
  });

  it("reorders tracks", async () => {
    const { probe, trackStore } = await mountBrowser();

    const report = await probe.measure(() =>
      trackStore.getState().reorderTracks(["third", "first", "second"]),
    );

    // Necessary: every row moves, so each renders once. The view and stack render once
    // for the new layout. Neither renderer data nor highlights change.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 3,
        "GenomeBrowserRuntime": 1,
        "Highlights": 2,
        "PanTrack": 6,
        "TestRenderer": 0,
        "TrackContent": 0,
        "TrackControls": 3,
        "TrackFrame": 3,
        "TrackRow": 3,
        "TrackStack": 1,
      }
    `);
  });
});
