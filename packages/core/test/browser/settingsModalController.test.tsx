// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsModalController } from "../../src/browser/overlays/SettingsModalController";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import { useSettingsStore, useTrackStore } from "../../src/browser/state/browserContextState";
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
  it("isolates modal header and field subscriptions", async () => {
    let modalRenderCount = 0;
    let headerRenderCount = 0;
    let baseRenderCount = 0;
    let colorRenderCount = 0;
    let titleRenderCount = 0;
    let moduleRenderCount = 0;
    let modalTitle: string | undefined;
    let modalColor: string | undefined;
    function Modal({ children, trackId }: SettingsModalProps) {
      modalRenderCount += 1;
      return (
        <div>
          <ModalHeader trackId={trackId} />
          {children}
        </div>
      );
    }
    function ModalHeader({ trackId }: { trackId: string }) {
      headerRenderCount += 1;
      const title = useTrackStore((state) => state.getTrack(trackId)?.base.title);
      const color = useTrackStore((state) => state.getTrack(trackId)?.base.color);
      modalTitle = title ? `Configure ${title}` : undefined;
      modalColor = color;
      return null;
    }
    function BaseSettings() {
      baseRenderCount += 1;
      return (
        <>
          <ColorField />
          <TitleField />
        </>
      );
    }
    function ColorField() {
      colorRenderCount += 1;
      const trackId = useSettingsStore((state) => state.trackId)!;
      const color = useTrackStore((state) => state.getTrack(trackId)?.base.color);
      const updateTrack = useTrackStore((state) => state.updateTrack);
      return (
        <button type="button" onClick={() => updateTrack(trackId, { base: { color: "#112233" } })}>
          Change {color}
        </button>
      );
    }
    function TitleField() {
      titleRenderCount += 1;
      const trackId = useSettingsStore((state) => state.trackId)!;
      const title = useTrackStore((state) => state.getTrack(trackId)?.base.title);
      return <span>{title}</span>;
    }
    function ModuleSettings() {
      moduleRenderCount += 1;
      return <div>Module settings</div>;
    }

    const module = { ...bigWigModule, settingsComponent: ModuleSettings };
    const track = module.create({
      id: "track",
      title: "Track",
      config: { url: "YOUR_URL_HERE" },
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });
    const settingsStore = createSettingsStore({
      modalComponent: Modal,
      baseSettingsComponent: BaseSettings,
    });
    settingsStore.getState().openSettings("track", { x: 0, y: 0 });

    await mountController(trackStore, settingsStore);
    expect(modalRenderCount).toBe(1);
    expect(headerRenderCount).toBe(1);
    expect(baseRenderCount).toBe(1);
    expect(colorRenderCount).toBe(1);
    expect(titleRenderCount).toBe(1);
    expect(moduleRenderCount).toBe(1);

    const button = container?.querySelector("button");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Settings button not found");
    await act(async () => button.click());

    expect(trackStore.getState().getTrack("track")?.base.color).toBe("#112233");
    expect(modalColor).toBe("#112233");
    expect(modalRenderCount).toBe(1);
    expect(headerRenderCount).toBe(2);
    expect(baseRenderCount).toBe(1);
    expect(colorRenderCount).toBe(2);
    expect(titleRenderCount).toBe(1);
    expect(moduleRenderCount).toBe(1);

    await act(async () => {
      trackStore.getState().updateTrack("track", { base: { title: "Updated track" } });
    });
    expect(modalTitle).toBe("Configure Updated track");
    expect(modalRenderCount).toBe(1);
    expect(headerRenderCount).toBe(3);
    expect(baseRenderCount).toBe(1);
    expect(titleRenderCount).toBe(2);
    expect(moduleRenderCount).toBe(1);
  });

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

    await mountController(trackStore, settingsStore);

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

async function mountController(
  trackStore: ReturnType<typeof createTrackStore>,
  settingsStore: ReturnType<typeof createSettingsStore>,
) {
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
}

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
