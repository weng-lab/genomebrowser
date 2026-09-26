// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  useTooltip,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const renderError = new Error("private tooltip exception");
const reportPrefix = "[genomebrowser] Tooltip render error";
const originalBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
let root: Root;
let container: HTMLDivElement;
let useBrowserStore: ReturnType<typeof createBrowserStore>;
let broken: boolean;
let reports: ReturnType<typeof vi.spyOn>;
let caught: unknown[];

beforeEach(async () => {
  broken = true;
  caught = [];
  vi.useFakeTimers();
  // Only the injected error may be intercepted. Unexpected diagnostics fail cleanup below.
  reports = vi.spyOn(console, "error").mockImplementation(() => {});
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 144, height: 30 }),
  });
  function Renderer({ id }: { id: string }) {
    const tooltip = useTooltip<{ id: string; secret: string }, Record<string, never>>();
    return (
      <rect
        data-testid={id}
        onMouseMove={(event) => tooltip.show({ id, secret: "private item" }, event)}
        onMouseLeave={() => tooltip.hide()}
      />
    );
  }
  function Tooltip({ item }: { item: { id: string; secret: string } }) {
    if (item.id === "broken" && broken) throw renderError;
    return <text>{item.id} tooltip</text>;
  }
  const module = defineTrackModule<{ id: string; secret: string }>()({
    type: "tooltip-errors",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: Renderer },
    tooltipComponent: Tooltip,
  });
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks: ["broken", "healthy"].map((id) =>
      module.create({ base: { id, title: id }, config: {} }),
    ),
  });
  useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 1_000, end: 2_000 },
    trackWidth: 1_000,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container, { onCaughtError: (error) => caught.push(error) });
  await act(async () =>
    root.render(
      <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
    ),
  );
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(container.querySelector("svg")!, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
});

afterEach(async () => {
  try {
    await act(async () => root.unmount());
    expect(caught.length).toBeGreaterThan(0);
    for (const error of caught) expect(error).toBe(renderError);
    expect(reports.mock.calls.length).toBeGreaterThan(0);
    for (const [prefix, detail] of reports.mock.calls) {
      expect(prefix).toBe(reportPrefix);
      expect(detail).toMatchObject({ error: renderError, extensionPoint: "tooltip content" });
    }
  } finally {
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (originalBBox) Object.defineProperty(SVGElement.prototype, "getBBox", originalBBox);
    else Reflect.deleteProperty(SVGElement.prototype, "getBBox");
  }
});

async function event(id: string, type = "mousemove", x = 40) {
  const target = container.querySelector(`[data-testid="${id}"]`);
  if (!target) throw new Error(`Missing renderer ${id}`);
  await act(async () =>
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: 50 })),
  );
  await act(async () => vi.advanceTimersByTimeAsync(20));
}

describe("tooltip failures through a registered module", () => {
  it("contains a failure, reports safe context once, and leaves navigation and tracks usable", async () => {
    await event("broken");
    expect(container.textContent).toContain("Tooltip unavailable");
    expect(container.textContent).not.toContain(renderError.message);
    expect(container.querySelector('[data-testid="healthy"]')).not.toBeNull();
    expect(reports.mock.calls[0]?.[1]).toMatchObject({
      componentStack: expect.stringContaining("Tooltip"),
    });
    expect(JSON.stringify(reports.mock.calls)).not.toContain("private item");
    const reportCount = reports.mock.calls.length;
    await event("broken", "mousemove", 120);
    await act(async () =>
      useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 1_100, end: 2_100 }),
    );
    expect(useBrowserStore.getState().region.start).toBe(1_100);
    expect(container.textContent).toContain("Tooltip unavailable");
    expect(reports.mock.calls).toHaveLength(reportCount);
  });

  it("shows another track's tooltip after a failure", async () => {
    await event("broken");
    expect(container.textContent).toContain("Tooltip unavailable");
    await event("healthy");
    expect(container.textContent).toContain("healthy tooltip");
    expect(container.textContent).not.toContain("Tooltip unavailable");
  });

  it("recovers the same owner's tooltip after hiding and showing it again", async () => {
    await event("broken");
    expect(container.textContent).toContain("Tooltip unavailable");
    await event("broken", "mouseout");
    expect(container.textContent).not.toContain("Tooltip unavailable");
    broken = false;
    await event("broken");
    expect(container.textContent).toContain("broken tooltip");
    expect(container.textContent).not.toContain("Tooltip unavailable");
  });
});
