// @vitest-environment jsdom
import { renderWithProbe } from "@weng-lab/render-probe";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createBrowserStore,
  createCompositeModule,
  createTrackStore,
  defineTrackModule,
  GenomeBrowser,
  useInteraction,
  useTooltip,
  type TrackRuntimeContext,
} from "../../src/lib";

type Config = { fail: boolean; label: string };
type Item = { id: string; x: number };
function TooltipRenderer({ id }: { id: string }) {
  const tooltip = useTooltip<Item, Config>();
  const interaction = useInteraction<Item>();
  return (
    <rect
      data-tooltip-target={id}
      ref={tooltip.target((position) =>
        position.clientX < 100 ? { id, x: position.clientX } : undefined,
      )}
      onMouseMove={(event) => {
        const item = { id, x: event.clientX };
        interaction?.onHover?.(item);
        tooltip.show(item, event);
      }}
      onClick={() => interaction?.onClick?.({ id, x: 0 })}
      onMouseLeave={tooltip.hide}
    />
  );
}
function ChildTooltip({ item, context }: { item: Item; context: TrackRuntimeContext<Config> }) {
  if (context.config.fail) throw new Error("test tooltip error");
  return (
    <g>
      <rect width={100} height={item.id === "a" ? 20 : 35} />
      <text>
        {item.id}:{item.x}:{context.config.label}
      </text>
    </g>
  );
}
let probe: Awaited<ReturnType<typeof renderWithProbe>>;
let hits: Element[];
const originalBBox = Object.getOwnPropertyDescriptor(SVGElement.prototype, "getBBox");
const originalHits = Object.getOwnPropertyDescriptor(document, "elementsFromPoint");
beforeEach(() => {
  hits = [];
  Object.defineProperty(document, "elementsFromPoint", { configurable: true, value: () => hits });
  // jsdom has no SVG layout. Browser verification covers real hit testing and measurement.
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value() {
      return {
        x: 0,
        y: 0,
        width: 100,
        height: this.getAttribute("data-tooltip-track") === "b" ? 35 : 20,
      };
    },
  });
});
afterEach(() => {
  probe?.unmount();
  vi.restoreAllMocks();
  if (originalBBox) Object.defineProperty(SVGElement.prototype, "getBBox", originalBBox);
  else Reflect.deleteProperty(SVGElement.prototype, "getBBox");
  if (originalHits) Object.defineProperty(document, "elementsFromPoint", originalHits);
  else Reflect.deleteProperty(document, "elementsFromPoint");
});
async function mount() {
  const onHover = vi.fn<(item: Item, context: TrackRuntimeContext<Config>) => void>();
  const onClick = vi.fn<(item: Item, context: TrackRuntimeContext<Config>) => void>();
  const module = defineTrackModule<Item>()({
    type: "tooltip",
    configSchema: z.object({
      fail: z.boolean().default(false),
      label: z.string().default("original"),
    }),
    fetch: async () => null,
    render: { full: TooltipRenderer },
    tooltipComponent: ChildTooltip,
  });
  const composite = createCompositeModule();
  const children = ["a", "b"].map((id) =>
    module.create({ base: { id, title: id }, config: {} }, { onHover, onClick }),
  );
  const store = createTrackStore({
    modules: [module, composite],
    tracks: [
      composite.create({
        base: { id: "group", title: "Group", display: "overlay" },
        tracks: children,
      }),
      module.create({ base: { id: "standalone", title: "Standalone" }, config: {} }),
    ],
  });
  const browser = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 1000,
  });
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browser} trackStore={store} />,
  );
  const svg = document.querySelector("#browserSVG")!;
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  Object.assign(svg, {
    createSVGPoint: () => point,
    getScreenCTM: () => ({ a: 1, b: 0, e: 0, f: 0, inverse: () => ({}) }),
  });
  hits = [target("b"), target("a")];
  return { store, onHover, onClick };
}
function target(id: string) {
  return document.querySelector(`[data-tooltip-target="${id}"]`)!;
}
function entries() {
  return [...document.querySelectorAll("[data-tooltip-track]")];
}
function move(id = "b", x = 40) {
  return probe.measure(async () => {
    target(id).dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: 50 }),
    );
    await new Promise(requestAnimationFrame);
  });
}
it("stacks child tooltips in reverse paint order without rendering tracks or routing callbacks", async () => {
  const { onHover, onClick } = await mount();
  const report = await move();
  expect(entries().map((entry) => entry.textContent)).toEqual(["b:40:original", "a:40:original"]);
  expect(entries().map((entry) => entry.getAttribute("transform"))).toEqual([
    "translate(0,0)",
    "translate(0,39)",
  ]);
  expect(onHover).toHaveBeenCalledTimes(1);
  expect(onHover.mock.calls[0]?.[1].base.id).toBe("b");
  await probe.measure(() => target("b").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onClick.mock.calls[0]?.[1].base.id).toBe("b");
  // Only the tooltip overlay and its two contents display new output. Track plots,
  // the coordinator, child renderers and the unrelated standalone track do no work.
  expect(
    report.pick(
      "TooltipOverlay",
      "ChildTooltip",
      "TooltipRenderer",
      "TrackPlot",
      "TrackRow",
      "CompositeTooltip",
    ),
  ).toMatchInlineSnapshot(`
    {
      "ChildTooltip": 2,
      "CompositeTooltip": 0,
      "TooltipOverlay": 2,
      "TooltipRenderer": 0,
      "TrackPlot": 0,
      "TrackRow": 0,
    }
  `);
});
it("uses current child order and configuration and clears stale content on removal", async () => {
  const { store } = await mount();
  await move();
  await probe.measure(() => store.getState().reorderChildren("group", ["b", "a"]));
  expect(entries()).toHaveLength(0);
  await move("a");
  expect(entries().map((entry) => entry.getAttribute("data-tooltip-track"))).toEqual(["a", "b"]);
  await probe.measure(() => store.getState().updateTrack("a", { config: { label: "edited" } }));
  await move("a");
  expect(entries()[0]?.textContent).toBe("a:40:edited");
  await probe.measure(() => store.getState().removeTrack("a"));
  hits = [target("b")];
  expect(entries()).toHaveLength(0);
  await move();
  expect(entries().map((entry) => entry.textContent)).toEqual(["b:40:original"]);
});
it("omits missing hits and values, and keeps stack and standalone tooltips individual", async () => {
  const { store } = await mount();
  hits = [target("a")];
  await move();
  expect(entries().map((entry) => entry.textContent)).toEqual(["a:40:original"]);
  await move("b", 120);
  expect(entries()).toHaveLength(0);
  hits = [target("b"), target("a")];
  await move();
  await probe.measure(() => store.getState().updateTrack("group", { base: { display: "stack" } }));
  expect(entries()).toHaveLength(0);
  await move();
  expect(document.querySelector("[data-genomebrowser-tooltip-overlay]")?.textContent).toBe(
    "b:40:original",
  );
  await move("standalone");
  expect(document.querySelector("[data-genomebrowser-tooltip-overlay]")?.textContent).toBe(
    "standalone:40:original",
  );
});
it.each(["mouseout", "pointerdown", "pointercancel", "wheel"])(
  "dismisses on %s, including a pending tooltip frame",
  async (type) => {
    await mount();
    await move();
    await probe.measure(async () => {
      target("b").dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 40 }));
      target("b").dispatchEvent(new MouseEvent(type, { bubbles: true }));
      await new Promise(requestAnimationFrame);
    });
    expect(document.querySelector("[data-genomebrowser-tooltip-overlay]")).toBeNull();
  },
);
it("contains a child's tooltip render failure while showing its sibling", async () => {
  const { store } = await mount();
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  await probe.measure(() => store.getState().updateTrack("b", { config: { fail: true } }));
  await move();
  expect(entries().map((entry) => entry.textContent)).toEqual([
    "Tooltip unavailable",
    "a:40:original",
  ]);
  expect(
    errors.mock.calls.some(([message]) => message === "[genomebrowser] Tooltip render error"),
  ).toBe(true);
  for (const [message, detail] of errors.mock.calls) {
    expect(
      message === "[genomebrowser] Tooltip render error" ||
        (message === "%o\n\n%s\n\n%s\n" &&
          detail instanceof Error &&
          detail.message === "test tooltip error"),
    ).toBe(true);
  }
});

it.each(["blur", "scroll", "resize"])("cancels pending content on window %s", async (type) => {
  await mount();
  await probe.measure(async () => {
    target("b").dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 40 }));
    window.dispatchEvent(new Event(type));
    await new Promise(requestAnimationFrame);
  });
  expect(document.querySelector("[data-genomebrowser-tooltip-overlay]")).toBeNull();
});
