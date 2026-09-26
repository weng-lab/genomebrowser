// @vitest-environment jsdom

import { renderWithProbe, type Probe, type RenderReport } from "@weng-lab/render-probe";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { useTooltip } from "../../src/browser/tooltip/useTooltip";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

// Render budgets: exact committed render counts for common interactions. A higher
// number fails the test. Accept a lower one with `vitest -u` after confirming it.
// See .agents/skills/verify-renders/SKILL.md.

function TestRenderer({ color }: { color: string }) {
  return <rect fill={color} />;
}

function TestSettings() {
  return <div>Test settings</div>;
}

const module = defineTrackModule({
  type: "render-budget-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: TestRenderer },
  settingsComponent: TestSettings,
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

function TooltipRenderer() {
  const tooltip = useTooltip<string, Record<string, never>>();
  return (
    <rect
      data-testid="tooltip-target"
      onMouseMove={(event) => tooltip.show("item", event)}
      onMouseLeave={tooltip.hide}
    />
  );
}

function TestTooltip({ item }: { item: string }) {
  return <text>{item}</text>;
}

const tooltipModule = defineTrackModule<string>()({
  type: "render-budget-tooltip-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: TooltipRenderer },
  tooltipComponent: TestTooltip,
});

let probe: Probe | undefined;

afterEach(() => {
  probe?.unmount();
  probe = undefined;
  slowRequests = undefined;
});

async function mountBrowser({
  slowTrack = false,
  tooltipTrack = false,
}: { slowTrack?: boolean; tooltipTrack?: boolean } = {}) {
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 0, end: 1_000 },
    marginWidth: 100,
    trackWidth: 1_000,
    titleSize: 10,
  });
  const trackStore = createTrackStore({
    modules: [module, slowModule, tooltipModule],
    tracks: [
      ...(slowTrack || tooltipTrack ? ["first", "second"] : ["first", "second", "third"]).map(
        createTrack,
      ),
      ...(tooltipTrack
        ? [
            tooltipModule.create({
              base: { id: "third", title: "third", height: 20 },
              config: {},
            }),
          ]
        : []),
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
function budget(report: RenderReport, ...extra: string[]) {
  return report.pick(
    ...extra,
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
    // per row component, 6 PanTracks, and 2 Highlights, then 1 per row when its data
    // arrives. Mounting still takes a second commit of the view for the SVG element.
    expect(budget(probe.mounted)).toMatchInlineSnapshot(`
      {
        "BrowserView": 2,
        "ConnectedTrackRow": 9,
        "GenomeBrowserRuntime": 2,
        "Highlights": 4,
        "PanTrack": 18,
        "TestRenderer": 3,
        "TrackContent": 6,
        "TrackControls": 9,
        "TrackFrame": 9,
        "TrackRow": 9,
        "TrackStack": 2,
      }
    `);
  });

  it("commits a region change and settles the fetch", async () => {
    const { probe, browserStore } = await mountBrowser();

    const report = await probe.measure(() =>
      browserStore.getState().setRegion({ chromosome: "chr1", start: 500, end: 1_500 }),
    );

    // Necessary: every row renders once for the new region; the pan keeps each track's
    // old data on screen and its new data arrives in the same commit. The view, stack,
    // and both Highlights layers reposition once. The runtime reads the region.
    expect(budget(report)).toMatchInlineSnapshot(`
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
    // loaded on each side, so no track fetches. Drag frames move the content without
    // rendering. Necessary: the commit renders every row once for the new visible
    // region, and the view, stack, and Highlights once.
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

  it("shows fast tracks before a slow track resolves", async () => {
    const { probe, browserStore } = await mountBrowser({ slowTrack: true });
    const requests: (() => void)[] = [];
    slowRequests = requests;

    // setRegion commits a region outside the loaded window. The two fast tracks
    // resolve at once and the third track's request stays pending. Necessary: every
    // row renders once for the new region, then each fast row once for its data.
    const commit = await probe.measure(() =>
      browserStore.getState().setRegion({ chromosome: "chr1", start: 3_000, end: 4_000 }),
    );
    expect(requests).toHaveLength(1);
    expect(budget(commit)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 5,
        "GenomeBrowserRuntime": 1,
        "Highlights": 2,
        "PanTrack": 10,
        "TestRenderer": 5,
        "TrackContent": 5,
        "TrackControls": 5,
        "TrackFrame": 5,
        "TrackRow": 5,
        "TrackStack": 1,
      }
    `);

    // Necessary: only the slow row renders for its data. Nothing else changes.
    const resolve = await probe.measure(() => requests[0]?.());
    expect(budget(resolve)).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "ConnectedTrackRow": 1,
        "GenomeBrowserRuntime": 0,
        "Highlights": 0,
        "PanTrack": 6,
        "TestRenderer": 1,
        "TrackContent": 1,
        "TrackControls": 3,
        "TrackFrame": 3,
        "TrackRow": 1,
        "TrackStack": 0,
      }
    `);
  });

  it("changes the track width", async () => {
    const { probe, browserStore } = await mountBrowser();

    // setTrackWidth resizes the view at once; the refetch at the new width waits for
    // the width debounce to settle. Necessary: every row renders once for the new
    // width and once for its new data; the view, stack, and Highlights once.
    const report = await probe.measure(async () => {
      browserStore.getState().setTrackWidth(1_200);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 6,
        "GenomeBrowserRuntime": 1,
        "Highlights": 2,
        "PanTrack": 18,
        "TestRenderer": 6,
        "TrackContent": 6,
        "TrackControls": 9,
        "TrackFrame": 9,
        "TrackRow": 6,
        "TrackStack": 1,
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

    // Necessary: the new row mounts once per component and renders again for its data,
    // and the view, stack, and Highlights render once for the taller browser. The three
    // existing rows do not move but still render once: createTrackLayouts returns new
    // layout objects. The loading gate re-renders every SwapTrack's frame twice.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 5,
        "GenomeBrowserRuntime": 1,
        "Highlights": 2,
        "PanTrack": 18,
        "TestRenderer": 1,
        "TrackContent": 2,
        "TrackControls": 9,
        "TrackFrame": 9,
        "TrackRow": 5,
        "TrackStack": 1,
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

    // Necessary: only the two Highlights layers. Nothing is wasted.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "ConnectedTrackRow": 0,
        "GenomeBrowserRuntime": 0,
        "Highlights": 2,
        "PanTrack": 0,
        "TestRenderer": 0,
        "TrackContent": 0,
        "TrackControls": 0,
        "TrackFrame": 0,
        "TrackRow": 0,
        "TrackStack": 0,
      }
    `);
  });

  it("removes a track", async () => {
    const { probe, trackStore } = await mountBrowser();

    const report = await probe.measure(() => trackStore.getState().removeTrack("second"));

    // Necessary: the view and stack render once for the shorter browser, and the third
    // row moves up. The first row does not move but still renders once:
    // createTrackLayouts returns new layout objects.
    expect(budget(report)).toMatchInlineSnapshot(`
      {
        "BrowserView": 1,
        "ConnectedTrackRow": 2,
        "GenomeBrowserRuntime": 1,
        "Highlights": 2,
        "PanTrack": 4,
        "TestRenderer": 0,
        "TrackContent": 0,
        "TrackControls": 2,
        "TrackFrame": 2,
        "TrackRow": 2,
        "TrackStack": 1,
      }
    `);
  });

  // A right click on a track calls the context menu store's `openContextMenu`.
  it("opens and closes the context menu", async () => {
    const { probe } = await mountBrowser();
    const target = Array.from(document.querySelectorAll("#browserSVG text")).find(
      (text) => text.textContent === "second (full)",
    );
    if (!target) throw new Error("Expected a track title");

    const opened = await probe.measure(() =>
      target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })),
    );
    expect(document.body.textContent).toContain("remove");
    const closed = await probe.measure(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(document.body.textContent).not.toContain("remove");

    // Necessary: only the menu renders to open and close. No browser or track component
    // renders.
    expect(budget(opened, "ContextMenuController")).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "ConnectedTrackRow": 0,
        "ContextMenuController": 1,
        "GenomeBrowserRuntime": 0,
        "Highlights": 0,
        "PanTrack": 0,
        "TestRenderer": 0,
        "TrackContent": 0,
        "TrackControls": 0,
        "TrackFrame": 0,
        "TrackRow": 0,
        "TrackStack": 0,
      }
    `);
    expect(budget(closed, "ContextMenuController")).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "ConnectedTrackRow": 0,
        "ContextMenuController": 1,
        "GenomeBrowserRuntime": 0,
        "Highlights": 0,
        "PanTrack": 0,
        "TestRenderer": 0,
        "TrackContent": 0,
        "TrackControls": 0,
        "TrackFrame": 0,
        "TrackRow": 0,
        "TrackStack": 0,
      }
    `);
  });

  // The settings button calls the settings store's `openSettings`.
  it("opens track settings", async () => {
    const { probe } = await mountBrowser();
    const button = document.querySelector('[aria-label="Settings for second"]');
    if (!button) throw new Error("Expected a settings button");

    const report = await probe.measure(() =>
      button.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(document.body.textContent).toContain("Test settings");

    // Necessary: only the settings modal and its content render. No browser or track
    // component renders.
    expect(budget(report, "SettingsModalController", "TestSettings")).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "ConnectedTrackRow": 0,
        "GenomeBrowserRuntime": 0,
        "Highlights": 0,
        "PanTrack": 0,
        "SettingsModalController": 1,
        "TestRenderer": 0,
        "TestSettings": 1,
        "TrackContent": 0,
        "TrackControls": 0,
        "TrackFrame": 0,
        "TrackRow": 0,
        "TrackStack": 0,
      }
    `);
  });

  // `useTooltip().show` and `hide` from a renderer's pointer events, which update the
  // browser's tooltip store after an animation frame.
  it("shows and hides a tooltip", async () => {
    const { probe } = await mountBrowser({ tooltipTrack: true });
    const svg = document.querySelector<SVGSVGElement>("#browserSVG")!;
    const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
    const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => matrix };
    Object.assign(svg, { createSVGPoint: () => point, getScreenCTM: () => matrix });
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 120, height: 30 }),
    });
    onTestFinished(() => {
      Reflect.deleteProperty(SVGElement.prototype, "getBBox");
    });
    const target = document.querySelector('[data-testid="tooltip-target"]')!;

    const shown = await probe.measure(async () => {
      target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 200 }));
      await new Promise(requestAnimationFrame);
    });
    const hidden = await probe.measure(() =>
      target.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })),
    );

    // Necessary: the overlay renders the content, then again once it is measured.
    // Hiding renders only the overlay. No browser or track component renders.
    const names = ["BrowserView", "TrackStack", "TrackRow", "TooltipRenderer", "TooltipOverlay"];
    expect(shown.pick(...names, "TestTooltip")).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "TestTooltip": 1,
        "TooltipOverlay": 2,
        "TooltipRenderer": 0,
        "TrackRow": 0,
        "TrackStack": 0,
      }
    `);
    expect(hidden.pick(...names)).toMatchInlineSnapshot(`
      {
        "BrowserView": 0,
        "TooltipOverlay": 1,
        "TooltipRenderer": 0,
        "TrackRow": 0,
        "TrackStack": 0,
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
