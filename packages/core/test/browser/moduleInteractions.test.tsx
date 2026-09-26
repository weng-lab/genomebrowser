// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  useInteraction,
  useTooltip,
  type TrackRuntimeContext,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement;
const originalBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no SVG measurement. These cases check content and ownership, not positioning.
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 100, height: 20 }),
  });
});
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  vi.useRealTimers();
  if (originalBBox) Object.defineProperty(SVGElement.prototype, "getBBox", originalBBox);
  else Reflect.deleteProperty(SVGElement.prototype, "getBBox");
});

type Config = { label: string };
type Item = { id: string };
async function mount() {
  const onClick = vi.fn();
  function Renderer({ id }: { id: string }) {
    const interaction = useInteraction<Item>();
    const tooltip = useTooltip<Item, Config>();
    return (
      <rect
        data-testid={id}
        onClick={() => interaction?.onClick?.({ id })}
        onMouseMove={(event) => tooltip.show({ id }, event)}
        onMouseLeave={() => tooltip.hide()}
      />
    );
  }
  const module = defineTrackModule<Item>()({
    type: "interactive",
    configSchema: z.object({ label: z.string() }),
    fetch: async () => null,
    render: { full: Renderer },
    tooltipComponent: ({ item, context }: { item: Item; context: TrackRuntimeContext<Config> }) => (
      <text data-testid="tooltip">
        {item.id}: {context.config.label} {context.base.color}
      </text>
    ),
  });
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks: ["first", "second"].map((id) =>
      module.create(
        { base: { id, title: id, color: "#112233" }, config: { label: "Original" } },
        { onClick },
      ),
    ),
  });
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10_000 } },
    region: { chromosome: "chr1", start: 1_000, end: 2_000 },
    trackWidth: 1_000,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <GenomeBrowser sizing="fixed" browserStore={useBrowserStore} trackStore={useTrackStore} />,
    ),
  );
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(container.querySelector("svg")!, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ inverse: () => ({}) }),
  });
  return { useTrackStore, onClick };
}
async function event(id: string, type: string) {
  const target = container.querySelector(`[data-testid="${id}"]`);
  if (!target) throw new Error(`Missing ${id}`);
  await act(async () =>
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 10, clientY: 20 })),
  );
  await act(async () => vi.advanceTimersByTimeAsync(20));
}
const tooltipText = () => container.querySelector('[data-testid="tooltip"]')?.textContent;

it("delivers item-only renderer interactions with current track context to the host", async () => {
  const t = await mount();
  await event("first", "click");
  expect(t.onClick).toHaveBeenLastCalledWith(
    { id: "first" },
    expect.objectContaining({
      type: "interactive",
      base: expect.objectContaining({ id: "first", color: "#112233" }),
      config: { label: "Original" },
    }),
  );
  await act(async () =>
    t.useTrackStore
      .getState()
      .updateTrack("first", { base: { color: "#abcdef" }, config: { label: "Updated" } }),
  );
  await event("first", "click");
  expect(t.onClick).toHaveBeenLastCalledWith(
    { id: "first" },
    expect.objectContaining({
      base: expect.objectContaining({ color: "#abcdef" }),
      config: { label: "Updated" },
    }),
  );
  expect(t.onClick).toHaveBeenCalledTimes(2);
});

it("renders tooltip content with current context and lets only its owner dismiss it", async () => {
  const t = await mount();
  await event("first", "mousemove");
  expect(tooltipText()).toBe("first: Original #112233");
  await act(async () =>
    t.useTrackStore
      .getState()
      .updateTrack("first", { base: { color: "#abcdef" }, config: { label: "Updated" } }),
  );
  await event("first", "mousemove");
  expect(tooltipText()).toBe("first: Updated #abcdef");
  await event("second", "mousemove");
  await event("first", "mouseout");
  expect(tooltipText()).toBe("second: Original #112233");
  await event("second", "mouseout");
  expect(tooltipText()).toBeUndefined();
  await event("second", "mousemove");
  await act(async () => t.useTrackStore.getState().removeTrack("second"));
  expect(tooltipText()).toBeUndefined();
});
