// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createBrowserStore,
  createCompositeModule,
  createTrackStore,
  defineTrackModule,
  GenomeBrowser,
  TrackOverlay,
  useAutoTrackHeight,
  useInteraction,
  type TrackFetchContext,
  type TrackSettingsProps,
} from "../../src/lib";
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  vi.restoreAllMocks();
});

function Renderer({
  id,
  height,
  config,
}: {
  id: string;
  height: number;
  config: { fail: boolean; rows: number };
}) {
  const interaction = useInteraction<string>();
  useAutoTrackHeight(id, config.rows, { rowHeight: 20, minHeight: 20 });
  if (config.fail) throw new Error("Renderer failed");
  return (
    <>
      <rect
        data-render={id}
        height={height}
        width={200}
        onClick={() => interaction?.onClick?.(id)}
      />
      <TrackOverlay>
        <text data-overlay={id}>{id}</text>
      </TrackOverlay>
    </>
  );
}
const composite = createCompositeModule();
async function setup() {
  const pending = new Map<
    string,
    { resolve: (data: null) => void; reject: (error: Error) => void }
  >();
  const contexts = new Map<string, TrackFetchContext<{ fail: boolean; rows: number }>>();
  const fetch = vi.fn((context: TrackFetchContext<{ fail: boolean; rows: number }>) => {
    contexts.set(context.track.base.id, context);
    context.resources.set("retained", { id: context.track.base.id });
    return new Promise<null>((resolve, reject) =>
      pending.set(context.track.base.id, { resolve, reject }),
    );
  });
  const module = defineTrackModule<string>()({
    type: "signal",
    configSchema: z.object({ fail: z.boolean().default(false), rows: z.number().default(2) }),
    fetch,
    render: { full: Renderer },
    settingsComponent: ({
      updateTrack,
    }: TrackSettingsProps<{ fail: boolean; rows: number }, string>) => (
      <button onClick={() => updateTrack({ base: { color: "#123456" } })}>Color child</button>
    ),
  });
  const click = vi.fn();
  const store = createTrackStore({
    modules: [module, composite],
    tracks: ["a", "b", "c"].map((id) =>
      module.create({ base: { id, title: id, height: 40 }, config: {} }, { onClick: click }),
    ),
  });
  const browser = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    marginWidth: 100,
    trackWidth: 1000,
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root!.render(<GenomeBrowser sizing="fixed" browserStore={browser} trackStore={store} />),
  );
  return { store, browser, fetch, pending, contexts, click };
}

it("preserves pending requests and resources through grouping, extraction and layout changes", async () => {
  const { store, fetch, pending, contexts, click, browser } = await setup();
  const aResources = contexts.get("a")!.resources;
  const retained = aResources.get("retained");
  await act(async () => {
    expect(
      store.getState().groupTracks({ id: "group", title: "Group", trackIds: ["b", "a"] }).ok,
    ).toBe(true);
  });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(contexts.get("a")!.signal!.aborted).toBe(false);
  await act(async () => pending.get("a")!.resolve(null));
  expect(container.querySelector('[data-render="a"]')).not.toBeNull();
  expect(container.querySelector('[data-render="b"]')).toBeNull();
  expect(browser.getState().isLoading).toBe(true);
  await act(async () => {
    pending.get("b")!.reject(new Error("Failed B"));
    pending.get("c")!.resolve(null);
  });
  expect(container.textContent).toContain("Failed B");
  expect(container.querySelector('[data-render="a"]')).not.toBeNull();
  expect(browser.getState().isLoading).toBe(false);
  await act(async () => {
    store.getState().updateTrack("group", {
      base: { display: "overlay", height: 150 },
      config: { opacity: 0.6 },
    });
  });
  expect(container.querySelector('[data-render="a"]')?.getAttribute("height")).toBe("150");
  expect(container.querySelector('[data-track-plot="a"]')?.getAttribute("opacity")).toBe("0.6");
  expect(
    container
      .querySelector('[data-overlay="a"]')
      ?.parentElement?.parentElement?.getAttribute("transform"),
  ).toBe("translate(100,0)");
  await act(async () =>
    container
      .querySelector('[data-render="a"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(click).toHaveBeenCalledWith(
    "a",
    expect.objectContaining({ base: expect.objectContaining({ id: "a" }) }),
  );
  await act(async () => {
    store.getState().extractTracks("group", ["a"]);
  });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(aResources.get("retained")).toBe(retained);
  expect(container.querySelector('[data-render="a"]')?.getAttribute("height")).toBe("40");
  await act(async () => {
    store.getState().removeTrack("group");
  });
  expect(contexts.get("b")!.resources.get("retained")).toBeUndefined();
  expect(aResources.get("retained")).toBe(retained);
  await act(async () => {
    store.getState().removeTrack("a");
  });
  expect(aResources.get("retained")).toBeUndefined();
});

it("derives stack heights, retains configured overlay height, and retries corrected child renderers", async () => {
  const { store, pending, fetch } = await setup();
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => {
    store.getState().groupTracks({
      id: "group",
      title: "Group",
      trackIds: ["a", "b"],
      base: { height: 150 },
      config: { gap: 7 },
    });
    pending.forEach((request) => request.resolve(null));
  });
  expect(container.querySelector('[data-plot-height="87"]')).not.toBeNull();
  await act(async () => {
    store.getState().updateTrack("a", { config: { rows: 4 } });
  });
  expect(store.getState().getTrack("a")!.base.height).toBe(80);
  expect(container.querySelector('[data-plot-height="127"]')).not.toBeNull();
  await act(async () => {
    store.getState().updateTrack("group", { base: { display: "overlay" } });
  });
  expect(container.querySelector('[data-render="a"]')?.getAttribute("height")).toBe("150");
  expect(store.getState().getTrack("group")!.base.height).toBe(150);
  await act(async () => {
    store.getState().updateTrack("a", { config: { fail: true } });
  });
  expect(container.textContent).toContain("Track unavailable: a");
  expect(container.querySelector('[data-render="b"]')).not.toBeNull();
  await act(async () => {
    store.getState().updateTrack("a", { config: { fail: false } });
  });
  expect(container.querySelector('[data-render="a"]')).not.toBeNull();
  await act(async () => {
    store.getState().updateTrack("group", { base: { display: "stack" } });
  });
  expect(container.querySelector('[data-plot-height="127"]')).not.toBeNull();
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(log).toHaveBeenCalled();
});

it("aborts removed pending children and releases all resources when deleting a composite", async () => {
  const { store, contexts } = await setup();
  await act(async () => {
    store.getState().groupTracks({ id: "group", title: "Group", trackIds: ["a", "b"] });
    store.getState().removeTrack("group");
  });
  for (const id of ["a", "b"]) {
    expect(contexts.get(id)!.signal!.aborted).toBe(true);
    expect(contexts.get(id)!.resources.get("retained")).toBeUndefined();
  }
  expect(contexts.get("c")!.signal!.aborted).toBe(false);
});

it("binds child settings by ID and disables structural UI for host composites", async () => {
  const { store, pending } = await setup();
  await act(async () => {
    store
      .getState()
      .groupTracks({ id: "group", title: "Group", trackIds: ["a", "b"], source: "host" });
    pending.forEach((request) => request.resolve(null));
  });
  await act(async () => {
    container
      .querySelector('[aria-label="Settings for Group"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const button = (text: string) =>
    Array.from(container.querySelectorAll("button")).find((button) => button.textContent === text)!;
  expect(button("Extract child track").closest("fieldset")!.disabled).toBe(true);
  await act(async () => button("Color child").click());
  expect(store.getState().getTrack("a")!.base.color).toBe("#123456");
  expect(store.getState().getTrack("b")!.base.color).toBe("#000000");
  const selector = Array.from(container.querySelectorAll("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === "b"),
  )!;
  await act(async () => {
    selector.value = "b";
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => button("Color child").click());
  expect(store.getState().getTrack("b")!.base.color).toBe("#123456");
});

it("retries a failed child renderer when new data arrives", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let fail = true;
  const module = defineTrackModule({
    type: "recover",
    configSchema: z.object({}),
    fetch: async () => ({ fail }),
    render: {
      full: ({ data }: { data: { fail: boolean } }) => {
        if (data.fail) throw new Error("Bad data");
        return <rect data-recovered="true" />;
      },
    },
  });
  const store = createTrackStore({
    modules: [module, composite],
    tracks: [
      composite.create({
        base: { id: "parent", title: "Parent" },
        tracks: [module.create({ base: { id: "child", title: "Child" }, config: {} })],
      }),
    ],
  });
  const browser = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    trackWidth: 1000,
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root!.render(<GenomeBrowser sizing="fixed" browserStore={browser} trackStore={store} />),
  );
  expect(container.textContent).toContain("Track unavailable: Child");
  fail = false;
  await act(async () => {
    browser.getState().setRegion({ chromosome: "chr1", start: 5000, end: 6000 });
  });
  expect(container.querySelector('[data-recovered="true"]')).not.toBeNull();
});
