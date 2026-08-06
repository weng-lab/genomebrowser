// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createTrackStore, type TrackStoreInstance } from "../../src/browser/state/trackStore";
import type { TrackInstance } from "../../src/modules/types";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import { BigWigSettings } from "../../src/tracks/bigwig/settings";
import type { BigWigConfig } from "../../src/tracks/bigwig/types";
import { TrackSettingsTestProvider } from "./trackSettingsTestProvider";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let useTrackStore: TrackStoreInstance | undefined;
let rejectNextUpdate = false;

function Harness() {
  const useStore = useTrackStore;
  if (!useStore) throw new Error("Track store not initialized");
  return (
    <TrackSettingsTestProvider trackId="signal" trackStore={useStore}>
      <BigWigSettings />
    </TrackSettingsTestProvider>
  );
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  useTrackStore = undefined;
  rejectNextUpdate = false;
});

describe("BigWig settings", () => {
  it("commits valid color drafts while retaining invalid drafts and accepted state", async () => {
    await renderHarness();
    const visibility = input("Show clamp indicators");
    const color = input("Clamp indicator color");

    expect(visibility.checked).toBe(true);
    expect(color.value).toBe("#ff0000");
    expect(color.disabled).toBe(false);

    await act(async () => setTextInput(color, "#663"));
    expect(input("Clamp indicator color").value).toBe("#663");
    expect(acceptedColor()).toBe("#ff0000");

    await act(async () => blurInput(color));
    expect(input("Clamp indicator color").value).toBe("#663");
    expect(input("Clamp indicator color").getAttribute("aria-invalid")).toBe("true");
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain("six-digit");
    expect(acceptedColor()).toBe("#ff0000");

    await act(async () => setTextInput(input("Clamp indicator color"), "#663399"));
    await act(async () => {
      input("Clamp indicator color").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(input("Clamp indicator color").value).toBe("#663399");
    expect(acceptedColor()).toBe("#663399");

    await act(async () => setTextInput(input("Clamp indicator color"), "#abcdef"));
    rejectNextUpdate = true;
    await act(async () => {
      input("Clamp indicator color").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(input("Clamp indicator color").value).toBe("#abcdef");
    expect(input("Clamp indicator color").getAttribute("aria-invalid")).toBe("true");
    expect(acceptedColor()).toBe("#663399");

    await act(async () => {
      useTrackStore?.getState().updateTrack("signal", {
        config: { clampIndicatorColor: "#AABBCC" },
      });
    });
    expect(input("Clamp indicator color").value).toBe("#AABBCC");
    expect(input("Clamp indicator color").getAttribute("aria-invalid")).toBe("false");

    await act(async () => visibility.click());
    expect(input("Show clamp indicators").checked).toBe(false);
    expect(input("Clamp indicator color").disabled).toBe(true);
    expect(input("Clamp indicator color").value).toBe("#AABBCC");

    await act(async () => input("Show clamp indicators").click());
    expect(input("Show clamp indicators").checked).toBe(true);
    expect(input("Clamp indicator color").disabled).toBe(false);
    expect(input("Clamp indicator color").value).toBe("#AABBCC");
  });
});

async function renderHarness() {
  useTrackStore = createTrackStore({
    modules: [bigWigModule],
    tracks: [
      bigWigModule.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      }),
    ],
  });
  const updateTrack = useTrackStore.getState().updateTrack;
  useTrackStore.setState({
    updateTrack: (id, update) => {
      if (rejectNextUpdate) {
        rejectNextUpdate = false;
        return updateTrack(id, { ...update, base: { height: 0 } });
      }
      return updateTrack(id, update);
    },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
}

function acceptedColor() {
  const track = useTrackStore?.getState().getTrack("signal") as
    | TrackInstance<BigWigConfig>
    | undefined;
  return track?.config.clampIndicatorColor;
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
