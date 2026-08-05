import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { SettingsModalController } from "../../src/browser/overlays/SettingsModalController";
import type { BaseSettingsProps } from "../../src/browser/settings/types";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { RegistryProvider } from "../../src/browser/state/RegistryContext";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { BrowserSvgProvider } from "../../src/browser/svg/BrowserSvgContext";
import { TrackContent } from "../../src/browser/track-row/TrackContent";
import { TooltipContextProvider } from "../../src/browser/tooltip/TooltipContext";
import { createTooltipStore } from "../../src/browser/tooltip/tooltipStore";
import { hg38 } from "../../src/genome/presets";
import { useTooltip } from "../../src/browser/tooltip/useTooltip";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { useInteraction } from "../../src/modules/interaction";
import type {
  AnyTrackTooltipComponent,
  TrackRendererInteraction,
  TrackRendererProps,
  TrackRuntimeContext,
  TrackSettingsProps,
} from "../../src/modules/types";

describe("browser module wiring", () => {
  const region = { chromosome: "chr1", start: 0, end: 10 };

  it("positions fetch errors at the top of the track content", () => {
    const module = defineTrackModule({
      type: "error-alignment-test",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: () => null },
    });
    const track = module.create({ id: "error", title: "Error", config: {}, height: 60 });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    const markup = renderToStaticMarkup(
      <RegistryProvider registry={trackStore.getState().registry}>
        <TrackContent
          track={track}
          dataState={{ status: "error", error: "Failed to load" }}
          region={region}
          width={100}
          height={track.base.height}
        />
      </RegistryProvider>,
    );

    expect(markup).toContain('transform="translate(40,0)"');
    expect(markup).toContain("Failed to load");
  });

  it("hides the error icon and scales the message for short tracks", () => {
    const module = defineTrackModule({
      type: "short-error-test",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: () => null },
    });
    const track = module.create({
      id: "short-error",
      title: "Short error",
      config: {},
      height: 10,
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    const markup = renderToStaticMarkup(
      <RegistryProvider registry={trackStore.getState().registry}>
        <TrackContent
          track={track}
          dataState={{ status: "error", error: "Failed to load" }}
          region={region}
          width={100}
          height={track.base.height}
        />
      </RegistryProvider>,
    );

    expect(markup).not.toContain("<svg");
    expect(markup).toContain('font-size="10px"');
    expect(markup).toContain('transform="translate(50,0)"');
  });

  it("binds current runtime context while keeping renderer callbacks item-only", () => {
    type Item = { id: string };
    type Config = { url: string; enabled: boolean };
    const rendererInteraction: { current: TrackRendererInteraction<Item> | null } = {
      current: null,
    };
    const events: Array<{ item: Item; context: TrackRuntimeContext<Config> }> = [];
    const onClick = (item: Item, context: TrackRuntimeContext<Config>) => {
      events.push({ item, context });
    };

    function Renderer(_props: TrackRendererProps<Config, null>) {
      rendererInteraction.current = useInteraction<Item>();
      return null;
    }

    const module = defineTrackModule<Item>()({
      type: "interactive-test",
      configSchema: z.object({ url: z.string().min(1), enabled: z.boolean().default(true) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create(
      {
        id: "interactive",
        title: "Interactive",
        config: { url: "YOUR_URL_HERE" },
      },
      { onClick },
    );
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    const renderTrack = () => {
      renderToStaticMarkup(
        <RegistryProvider registry={trackStore.getState().registry}>
          <TrackContent
            track={trackStore.getState().getTrack("interactive")!}
            dataState={{ status: "success", data: null }}
            region={region}
            width={100}
            height={80}
          />
        </RegistryProvider>,
      );
    };

    renderTrack();
    rendererInteraction.current?.onClick?.({ id: "first" });

    expect(events).toEqual([
      {
        item: { id: "first" },
        context: {
          type: "interactive-test",
          base: { ...track.base },
          config: { url: "YOUR_URL_HERE", enabled: true },
        },
      },
    ]);

    expect(
      trackStore.getState().updateTrack<Config>("interactive", {
        base: { color: "#112233" },
        config: { url: "YOUR_OTHER_URL_HERE" },
      }),
    ).toEqual({ ok: true });

    renderTrack();
    rendererInteraction.current?.onClick?.({ id: "second" });

    expect(events[1]).toEqual({
      item: { id: "second" },
      context: {
        type: "interactive-test",
        base: { ...track.base, color: "#112233" },
        config: { url: "YOUR_OTHER_URL_HERE", enabled: true },
      },
    });
  });

  it("renders tooltips with the same current runtime context", () => {
    type Item = { id: string };
    type Config = { url: string; enabled: boolean };
    let tooltip: ReturnType<typeof useTooltip<Item, Config>> | undefined;

    function Renderer() {
      tooltip = useTooltip<Item, Config>();
      return null;
    }

    function TooltipComponent() {
      return null;
    }

    const module = defineTrackModule<Item>()({
      type: "tooltip-test",
      defaults: { color: "#445566" },
      configSchema: z.object({ url: z.string().min(1), enabled: z.boolean().default(true) }),
      fetch: async () => null,
      render: { full: Renderer },
      tooltipComponent: TooltipComponent,
    });
    const track = module.create({
      id: "tooltip",
      title: "Tooltip",
      config: { url: "YOUR_URL_HERE" },
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });
    const tooltipStore = createTooltipStore();

    const renderTrack = () => {
      renderToStaticMarkup(
        <BrowserSvgProvider svg={null}>
          <TooltipContextProvider
            isDisabled={() => false}
            getTooltipComponent={() => module.tooltipComponent as AnyTrackTooltipComponent}
            store={tooltipStore}
          >
            <RegistryProvider registry={trackStore.getState().registry}>
              <TrackContent
                track={trackStore.getState().getTrack("tooltip")!}
                dataState={{ status: "success", data: null }}
                region={region}
                width={100}
                height={80}
              />
            </RegistryProvider>
          </TooltipContextProvider>
        </BrowserSvgProvider>,
      );
    };
    const showTooltip = (item: Item) => {
      tooltip?.show(item, { clientX: 10, clientY: 20 });
      const content = tooltipStore.getState().content;
      expect(isValidElement(content)).toBe(true);
      if (!isValidElement(content)) throw new Error("Expected tooltip content");
      return content.props as { item: Item; context: TrackRuntimeContext<Config> };
    };

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    try {
      renderTrack();
      expect(showTooltip({ id: "first" })).toEqual({
        item: { id: "first" },
        context: {
          type: "tooltip-test",
          base: track.base,
          config: { url: "YOUR_URL_HERE", enabled: true },
        },
      });

      expect(
        trackStore.getState().updateTrack<Config>("tooltip", {
          base: { color: "#abcdef" },
          config: { url: "YOUR_OTHER_URL_HERE" },
        }),
      ).toEqual({ ok: true });

      renderTrack();
      expect(showTooltip({ id: "second" })).toMatchObject({
        context: {
          type: "tooltip-test",
          base: { color: "#abcdef" },
          config: { url: "YOUR_OTHER_URL_HERE", enabled: true },
        },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("wires settings to the active track snapshot and a bound atomic updater", () => {
    let baseProps: BaseSettingsProps | undefined;
    let moduleProps: TrackSettingsProps<{ url: string }> | undefined;

    function Modal({ children }: { children: React.ReactNode }) {
      return <>{children}</>;
    }

    function BaseSettings(props: BaseSettingsProps) {
      baseProps = props;
      return null;
    }

    function ModuleSettings(props: TrackSettingsProps<{ url: string }>) {
      moduleProps = props;
      return null;
    }

    function Renderer() {
      return null;
    }

    const module = defineTrackModule({
      type: "settings-test",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: async () => null,
      render: { full: Renderer },
      settingsComponent: ModuleSettings,
    });
    const onClick = vi.fn();
    const track = module.create(
      {
        id: "settings",
        title: "Settings",
        config: { url: "YOUR_URL_HERE" },
      },
      { onClick },
    );
    const browserStore = createBrowserStore({ assembly: hg38, region });
    const contextMenuStore = createContextMenuStore();
    const settingsStore = createSettingsStore({
      modalComponent: Modal,
      baseSettingsComponent: BaseSettings,
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });
    settingsStore.getState().openSettings("settings", { x: 0, y: 0 });
    Object.assign(settingsStore.getInitialState(), settingsStore.getState());

    renderToStaticMarkup(
      <BrowserProvider value={{ browserStore, trackStore, contextMenuStore, settingsStore }}>
        <InteractionGateProvider value={{ isInteractionBlocked: false }}>
          <RegistryProvider registry={trackStore.getState().registry}>
            <SettingsModalController />
          </RegistryProvider>
        </InteractionGateProvider>
      </BrowserProvider>,
    );

    expect(baseProps?.base).toEqual(track.base);
    expect(moduleProps?.track).toEqual(track);
    expect(moduleProps?.track.interaction?.onClick).toBe(onClick);

    expect(baseProps?.updateTrack({ base: { title: "Updated" } })).toEqual({ ok: true });
    expect(
      moduleProps?.updateTrack({
        base: { height: 100 },
        config: { url: "YOUR_OTHER_URL_HERE" },
      }),
    ).toEqual({ ok: true });
    expect(trackStore.getState().getTrack("settings")).toMatchObject({
      base: { id: "settings", title: "Updated", height: 100 },
      config: { url: "YOUR_OTHER_URL_HERE" },
    });
  });
});
