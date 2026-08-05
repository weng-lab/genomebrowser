// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsModalController } from "../../src/browser/overlays/SettingsModalController";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { RegistryProvider } from "../../src/browser/state/RegistryContext";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { hg38 } from "../../src/genome/presets";
import type { SettingsModalProps } from "../../src/browser/settings/types";
import type { AnyTrackInstance } from "../../src/modules/types";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import type { BigWigConfig } from "../../src/tracks/bigwig/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("SettingsModalController", () => {
  it("does not carry a draft into another same-type track with the same accepted color", async () => {
    function Modal({ children }: SettingsModalProps) {
      return <div>{children}</div>;
    }

    const first = bigWigModule.create({
      id: "first",
      title: "First",
      config: { url: "YOUR_URL_HERE" },
    });
    const second = bigWigModule.create({
      id: "second",
      title: "Second",
      config: { url: "YOUR_OTHER_URL_HERE" },
    });
    const trackStore = createTrackStore({ modules: [bigWigModule], tracks: [first, second] });
    const settingsStore = createSettingsStore({ modalComponent: Modal });
    settingsStore.getState().openSettings("first", { x: 0, y: 0 });

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <BrowserProvider
          value={{
            browserStore: createBrowserStore({
              assembly: hg38,
              region: { chromosome: "chr1", start: 0, end: 10 },
            }),
            trackStore,
            contextMenuStore: createContextMenuStore(),
            settingsStore,
          }}
        >
          <InteractionGateProvider value={{ isInteractionBlocked: false }}>
            <RegistryProvider registry={trackStore.getState().registry}>
              <SettingsModalController />
            </RegistryProvider>
          </InteractionGateProvider>
        </BrowserProvider>,
      );
    });

    await act(async () => setTextInput(colorInput(), "#112233"));
    expect(colorInput().value).toBe("#112233");
    expect(acceptedColor(trackStore.getState().getTrack("first"))).toBe("#ff0000");

    await act(async () => settingsStore.getState().openSettings("second", { x: 0, y: 0 }));
    expect(colorInput().value).toBe("#ff0000");

    await act(async () => {
      colorInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(acceptedColor(trackStore.getState().getTrack("second"))).toBe("#ff0000");
  });
});

function colorInput() {
  const candidate = Array.from(container?.querySelectorAll("label") ?? [])
    .find((element) => element.textContent?.includes("Clamp indicator color"))
    ?.querySelector("input");
  if (!(candidate instanceof HTMLInputElement)) throw new Error("Color input not found");
  return candidate;
}

function setTextInput(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function acceptedColor(track: AnyTrackInstance | undefined) {
  return (track?.config as BigWigConfig | undefined)?.clampIndicatorColor;
}
