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

// Resolves immediately unless a test holds its requests with `holdSlowRequests`.
let slowRequests: (() => void)[] | undefined;
const slowModule = defineTrackModule({
  type: "render-budget-slow-test",
  configSchema: z.object({}),
  fetch: () =>
    new Promise<null>((resolve) => {
      if (slowRequests) slowRequests.push(() => resolve(null));
      else resolve(null);
    }),
  render: { full: TestRenderer },
});

let probe: Probe | undefined;

afterEach(() => {
  probe?.unmount();
  probe = undefined;
  slowRequests = undefined;
});

async function mountBrowser({ slowTrack = false }: { slowTrack?: boolean } = {}) {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 0, end: 1_000 },
    marginWidth: 100,
    trackWidth: 1_000,
    titleSize: 10,
  });
  const trackStore = createTrackStore({
    modules: [module, slowModule],
    tracks: [
      ...(slowTrack ? ["first", "second"] : ["first", "second", "third"]).map(createTrack),
      ...(slowTrack
        ? [
            slowModule.create({
              base: { id: "third", title: "third", height: 20 },
              config: {},
            }),
          ]
        : []),
    ],
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

  it("drags a pan inside the pre-loaded window", async () => {
    const { probe, browserStore } = await mountBrowser();
    const svg = document.querySelector<SVGSVGElement>("#browserSVG");
    const panTarget = Array.from(svg?.querySelectorAll<SVGGElement>("g") ?? []).find(
      (group) => group.style.cursor === "grab",
    );
    if (!svg || !panTarget) throw new Error("Expected a pannable track");
    installSvgCoordinates(svg);
    installPointerCapture(panTarget);

    // A 200px drag moves the view by 200 bases, well inside the one-span margin
    // loaded on each side.
    const report = await probe.measure(() => {
      panTarget.dispatchEvent(pointerEvent("pointerdown", 500));
      panTarget.dispatchEvent(pointerEvent("pointermove", 300));
      panTarget.dispatchEvent(pointerEvent("pointerup", 300));
    });

    expect(browserStore.getState().region).toEqual({
      chromosome: "chr1",
      start: 200,
      end: 1_200,
    });
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 3,
        "ConnectedTrackRow": 12,
        "GenomeBrowserRuntime": 3,
        "Highlights": 6,
        "PanTrack": 24,
        "TestRenderer": 6,
        "TrackContent": 9,
        "TrackControls": 12,
        "TrackFrame": 12,
        "TrackRow": 12,
        "TrackStack": 3,
      }
    `);
  });

  it("shows fast tracks before a slow track resolves", async () => {
    const { probe, browserStore } = await mountBrowser({ slowTrack: true });
    const requests: (() => void)[] = [];
    slowRequests = requests;

    // setRegion commits a region outside the loaded window. The two fast tracks
    // resolve at once and the third track's request stays pending.
    const commit = await probe.measure(() =>
      browserStore.getState().setRegion({ chromosome: "chr1", start: 3_000, end: 4_000 }),
    );
    expect(requests).toHaveLength(1);
    expect(budget(commit)).toMatchInlineSnapshot(`
      {
        "BrowserView": 2,
        "ConnectedTrackRow": 6,
        "GenomeBrowserRuntime": 1,
        "Highlights": 4,
        "PanTrack": 12,
        "TestRenderer": 3,
        "TrackContent": 6,
        "TrackControls": 6,
        "TrackFrame": 6,
        "TrackRow": 6,
        "TrackStack": 2,
      }
    `);

    const resolve = await probe.measure(() => requests[0]?.());
    expect(budget(resolve)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 3,
        "GenomeBrowserRuntime": 1,
        "Highlights": 2,
        "PanTrack": 6,
        "TestRenderer": 3,
        "TrackContent": 3,
        "TrackControls": 3,
        "TrackFrame": 3,
        "TrackRow": 3,
        "TrackStack": 1,
      }
    `);
  });

  it("changes the track width", async () => {
    const { probe, browserStore } = await mountBrowser();

    // setTrackWidth resizes the view at once; the refetch at the new width waits for
    // the width debounce to settle.
    const report = await probe.measure(async () => {
      browserStore.getState().setTrackWidth(1_200);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 3,
        "ConnectedTrackRow": 9,
        "GenomeBrowserRuntime": 1,
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

function installSvgCoordinates(svg: SVGSVGElement) {
  const point = {
    x: 0,
    y: 0,
    matrixTransform: () => ({ x: point.x, y: point.y }),
  };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
}

function installPointerCapture(element: SVGGElement) {
  let capturedPointerId: number | null = null;
  Object.assign(element, {
    hasPointerCapture: (pointerId: number) => capturedPointerId === pointerId,
    releasePointerCapture: () => {
      capturedPointerId = null;
    },
    setPointerCapture: (pointerId: number) => {
      capturedPointerId = pointerId;
    },
  });
}

function pointerEvent(type: string, clientX: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX,
    clientY: 0,
  });
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: 1 },
  });
  return event;
}
