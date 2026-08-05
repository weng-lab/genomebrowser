// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createTrackStore, type TrackStoreInstance } from "../../src/browser/state/trackStore";
import type { TrackInstance } from "../../src/modules/types";
import { caveModule } from "../../src/tracks/cave/module";
import { CaveSettings } from "../../src/tracks/cave/settings";
import type { CaveConfig } from "../../src/tracks/cave/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let useTrackStore: TrackStoreInstance | undefined;

function Harness() {
  const useStore = useTrackStore;
  if (!useStore) throw new Error("Track store not initialized");
  const track = useStore((state) => state.getTrack("cave")) as TrackInstance<CaveConfig>;

  return (
    <CaveSettings
      track={track}
      updateTrack={(update) => useStore.getState().updateTrack("cave", update)}
    />
  );
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  useTrackStore = undefined;
});

describe("CAVE settings", () => {
  it("updates concrete top and bottom colors", async () => {
    await renderHarness();

    expect(input("Top color").value).toBe("#000000");
    expect(input("Bottom color").value).toBe("#000000");

    await act(async () => setTextInput(input("Top color"), "#112233"));
    await act(async () => blurInput(input("Top color")));
    await act(async () => setTextInput(input("Bottom color"), "#445566"));
    await act(async () => blurInput(input("Bottom color")));
    expect(input("Top color").value).toBe("#112233");
    expect(input("Bottom color").value).toBe("#445566");
    const track = useTrackStore?.getState().getTrack("cave") as
      | TrackInstance<CaveConfig>
      | undefined;
    expect(track?.config).toMatchObject({ topColor: "#112233", bottomColor: "#445566" });
  });
});

async function renderHarness() {
  useTrackStore = createTrackStore({
    modules: [caveModule],
    tracks: [
      caveModule.create({
        id: "cave",
        title: "CAVE",
        config: { neurotransmitter: "GABA", age: "Adulthood" },
      }),
    ],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
}

function input(label: string) {
  const candidate = Array.from(container?.querySelectorAll("label") ?? [])
    .find((element) => element.textContent?.includes(label))
    ?.querySelector("input");
  if (!(candidate instanceof HTMLInputElement)) throw new Error(`Input not found: ${label}`);
  return candidate;
}

function setTextInput(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function blurInput(element: HTMLInputElement) {
  element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
}
