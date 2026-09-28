// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import {
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  GenomeBrowser,
  type TrackSource,
} from "@weng-lab/genomebrowser";
import { compositeModule } from "@weng-lab/genomebrowser-tracks/composite";
let root: Root | undefined;
let container: HTMLDivElement;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
});
async function setup(source: TrackSource = "user") {
  const childModule = defineTrackModule({
    type: "child",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: () => null },
    settingsComponent: ({ updateTrack }) => (
      <button onClick={() => updateTrack({ base: { color: "#123456" } })}>Color child</button>
    ),
  });
  const store = createTrackStore({
    modules: [childModule, compositeModule],
    tracks: [
      compositeModule.create({
        base: { id: "parent", title: "Parent" },
        source,
        tracks: ["a", "b"].map((id) => childModule.create({ base: { id, title: id }, config: {} })),
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
  await act(async () => {
    container
      .querySelector('[aria-label="Settings for Parent"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return { store, browser };
}
function button(text: string) {
  return Array.from(container.querySelectorAll("button")).find((e) => e.textContent === text)!;
}
async function select(label: string, text: string) {
  const control = Array.from(container.querySelectorAll('[role="combobox"]')).find(
    (e) =>
      document.getElementById(e.getAttribute("aria-labelledby")!.split(" ")[0])?.textContent ===
      label,
  )!;
  await act(async () => {
    control.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  });
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (e) => e.textContent === text,
  )!;
  await act(async () => {
    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
it("uses MUI controls, changes layout, and binds the selected child's settings by ID", async () => {
  const { store } = await setup();
  expect(container.querySelectorAll(".MuiTextField-root").length).toBeGreaterThan(0);
  await select("Layout", "overlay");
  expect(store.getState().getTrack("parent")!.base.display).toBe("overlay");
  await act(async () => button("Color child").click());
  expect(store.getState().getTrack("a")!.base.color).toBe("#123456");
  expect(store.getState().getTrack("b")!.base.color).toBe("#000000");
  await select("Child track", "b");
  await act(async () => button("Color child").click());
  expect(store.getState().getTrack("b")!.base.color).toBe("#123456");
  await act(async () => button("Move child earlier").click());
  expect(
    store
      .getState()
      .getTrack("parent")!
      .tracks?.map((t) => t.base.id),
  ).toEqual(["b", "a"]);
  await act(async () => button("Extract child track").click());
  expect(store.getState().order).toEqual(["parent", "b"]);
});
it("disables structural controls for host source and respects loading gates", async () => {
  const { store, browser } = await setup("host");
  expect(button("Extract child track").disabled).toBe(true);
  expect(button("Ungroup tracks").disabled).toBe(true);
  await act(async () => button("Color child").click());
  expect(store.getState().getTrack("a")!.base.color).toBe("#123456");
  await act(async () => {
    browser.setState({ isLoading: true });
  });
  expect(button("Color child").closest("fieldset")!.disabled).toBe(true);
});
