// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  type AnyTrackInstance,
  type TrackMutationResult,
  type TrackSettingsProps,
} from "../../src/lib";

let holdFetch = false;
const fetchData = () => (holdFetch ? new Promise<null>(() => {}) : Promise.resolve(null));
let useBrowserStore: ReturnType<typeof createBrowserStore>;

type SignalConfig = { url: string; clampIndicatorColor: string };
function SignalSettings({ track, updateTrack }: TrackSettingsProps<SignalConfig>) {
  const [color, setColor] = useState(track.config.clampIndicatorColor);
  return (
    <label>
      Clamp indicator color
      <input
        value={color}
        onChange={(event) => setColor(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") updateTrack({ config: { clampIndicatorColor: color } });
        }}
      />
    </label>
  );
}
const signalModule = defineTrackModule({
  type: "signal",
  configSchema: z.object({
    url: z.string().min(1),
    clampIndicatorColor: z.string().default("#ff0000"),
  }),
  fetch: fetchData,
  render: { full: () => null },
  settingsComponent: SignalSettings,
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  holdFetch = false;
});

describe("browser settings workflows", () => {
  it("passes the current complete track and a gated updater bound to its ID", async () => {
    type Item = { value: number };
    type Config = { url: string };
    let receivedProps: TrackSettingsProps<Config, Item> | undefined;

    function ModuleSettings(props: TrackSettingsProps<Config, Item>) {
      receivedProps = props;
      return <div>Settings for {props.track.base.id}</div>;
    }
    function Renderer() {
      return null;
    }

    const module = defineTrackModule<Item>()({
      type: "bound-settings",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: fetchData,
      render: { full: Renderer },
      settingsComponent: ModuleSettings,
    });
    const first = module.create({
      base: {
        id: "first",
        title: "First",
      },
      config: { url: "YOUR_URL_HERE" },
    });
    const onClick = () => undefined;
    const active = module.create(
      {
        base: {
          id: "active",
          title: "Active",
        },
        config: { url: "YOUR_OTHER_URL_HERE" },
      },
      { onClick },
    );
    const useTrackStore = createTrackStore({ modules: [module], tracks: [first, active] });
    await mountBrowser(useTrackStore);
    await openSettings("Active");

    const initialProps = requireValue(receivedProps, "Module settings props not received");
    expect(initialProps.track).toEqual(useTrackStore.getState().getTrack("active"));
    expect(initialProps.track).toMatchObject({
      type: "bound-settings",
      base: { id: "active", title: "Active" },
      config: { url: "YOUR_OTHER_URL_HERE" },
      interaction: { onClick },
    });

    const nextOnClick = () => undefined;
    let updateResult: TrackMutationResult | undefined;
    await act(async () => {
      updateResult = requireValue(receivedProps, "Module settings props not received").updateTrack({
        base: { title: "Updated active" },
        config: { url: "YOUR_URL_HERE" },
        interaction: { onClick: nextOnClick },
      });
    });

    expect(updateResult).toEqual({ ok: true });
    expect(useTrackStore.getState().getTrack("first")?.base.title).toBe("First");
    expect(useTrackStore.getState().getTrack("active")).toMatchObject({
      base: { id: "active", title: "Updated active" },
      config: { url: "YOUR_URL_HERE" },
      interaction: { onClick: nextOnClick },
    });
    expect(requireValue(receivedProps, "Module settings props not received").track).toEqual(
      useTrackStore.getState().getTrack("active"),
    );

    await blockInteractions();
    let blockedResult: TrackMutationResult | undefined;
    await act(async () => {
      blockedResult = requireValue(receivedProps, "Module settings props not received").updateTrack(
        { base: { title: "Blocked update" } },
      );
    });
    expect(blockedResult).toEqual({
      ok: false,
      code: "INTERACTION_BLOCKED",
      error: "Track interactions are currently blocked",
    });
    expect(useTrackStore.getState().getTrack("active")?.base.title).toBe("Updated active");

    await act(async () => {
      useTrackStore.getState().removeTrack("active");
    });
    expect(container?.textContent).not.toContain("Settings for active");
  });

  it("validates same-type bulk updates atomically and blocks both mutation paths", async () => {
    let props: TrackSettingsProps<SignalConfig> | undefined;
    const module = {
      ...signalModule,
      settingsComponent: (value: TrackSettingsProps<SignalConfig>) => {
        props = value;
        return null;
      },
    };
    const otherModule = defineTrackModule({
      type: "other",
      configSchema: z.object({ url: z.string(), clampIndicatorColor: z.string() }),
      fetch: fetchData,
      render: { full: () => null },
    });
    const first = module.create({
      base: { id: "first", title: "First", height: 30 },
      config: { url: "YOUR_URL_HERE" },
    });
    const second = module.create({
      base: { id: "second", title: "Second", height: 50 },
      config: { url: "YOUR_URL_HERE" },
    });
    const other = { ...first, type: "other", base: { ...first.base, id: "other" } };
    const useTrackStore = createTrackStore({
      modules: [module, otherModule],
      tracks: [first, second, other],
    });
    await mountBrowser(useTrackStore);
    await openSettings("First");
    expect(props?.displayOptions).toEqual(["full"]);
    const before = useTrackStore.getState().tracks;
    let result: TrackMutationResult | undefined;
    await act(async () => {
      result = props?.updateTracksOfType((track) => ({
        config: { url: track.base.id === "second" ? "" : "YOUR_OTHER_URL_HERE" },
      }));
    });
    expect(result?.ok).toBe(false);
    expect(useTrackStore.getState().tracks).toEqual(before);
    await act(async () => {
      result = props?.updateTracksOfType((track) => ({ base: { height: track.base.height + 10 } }));
    });
    expect(result).toEqual({ ok: true });
    expect(useTrackStore.getState().tracks.map((track) => track.base.height)).toEqual([40, 60, 30]);
    await blockInteractions();
    await act(async () => {
      result = props?.updateTracksOfType(() => ({ base: { height: 100 } }));
    });
    expect(result).toEqual({
      ok: false,
      code: "INTERACTION_BLOCKED",
      error: "Track interactions are currently blocked",
    });
    expect(useTrackStore.getState().tracks.map((track) => track.base.height)).toEqual([40, 60, 30]);
  });

  it("does not open an empty dialog for a module without settings", async () => {
    const module = { ...signalModule, settingsComponent: undefined };
    const track = module.create({
      base: { id: "plain", title: "Plain" },
      config: { url: "YOUR_URL_HERE" },
    });
    const useTrackStore = createTrackStore({ modules: [module], tracks: [track] });
    await mountBrowser(useTrackStore);
    expect(container?.querySelector('[aria-label="Settings for Plain"]')).toBeNull();
    expect(container?.querySelector("dialog")).toBeNull();
  });

  it("does not carry a draft into another same-type track with the same accepted color", async () => {
    const first = signalModule.create({
      base: {
        id: "first",
        title: "First",
      },
      config: { url: "YOUR_URL_HERE" },
    });
    const second = signalModule.create({
      base: {
        id: "second",
        title: "Second",
      },
      config: { url: "YOUR_OTHER_URL_HERE" },
    });
    const useTrackStore = createTrackStore({ modules: [signalModule], tracks: [first, second] });
    await mountBrowser(useTrackStore);
    await openSettings("First");

    await act(async () => setTextInput(colorInput(), "#112233"));
    expect(colorInput().value).toBe("#112233");
    expect(acceptedColor(useTrackStore.getState().getTrack("first"))).toBe("#ff0000");

    await openSettings("Second");
    expect(colorInput().value).toBe("#ff0000");

    await act(async () => {
      colorInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(acceptedColor(useTrackStore.getState().getTrack("second"))).toBe("#ff0000");
    await act(async () =>
      container
        ?.querySelector('[aria-label="Close settings"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(container?.querySelector("dialog")).toBeNull();
    await openSettings("First");
    expect(colorInput().value).toBe("#ff0000");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(container?.querySelector("dialog")).toBeNull();
  });
});

async function mountBrowser(useTrackStore: ReturnType<typeof createTrackStore>) {
  useBrowserStore = createBrowserStore({
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
}

async function openSettings(title: string) {
  const button = container?.querySelector(`[aria-label="Settings for ${title}"]`);
  if (!button) throw new Error(`No settings control for ${title}`);
  await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

async function blockInteractions() {
  holdFetch = true;
  await act(async () =>
    useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 5_000, end: 6_000 }),
  );
  expect(useBrowserStore.getState().isLoading).toBe(true);
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
  return (track?.config as SignalConfig | undefined)?.clampIndicatorColor;
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
