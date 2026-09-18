import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { SettingsModalController } from "../../src/browser/overlays/SettingsModalController";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import type { TrackSettingsProps } from "../../src/modules/types";
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
} from "../../src/modules/types";

describe("browser module wiring", () => {
  const region = { chromosome: "chr1", start: 0, end: 10 };

  it("constrains fetch errors to a scrollable track region", () => {
    const module = defineTrackModule({
      type: "error-alignment-test",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: () => null },
    });
    const track = module.create({ base: { id: "error", title: "Error", height: 60 }, config: {} });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    const markup = renderToStaticMarkup(
      <RegistryProvider registry={trackStore.getState().registry}>
        <TrackContent
          track={track}
          dataState={{ status: "error", error: "Failed to load" }}
          visibleRegion={region}
          region={region}
          width={100}
          height={track.base.height}
        />
      </RegistryProvider>,
    );

    expect(markup).toContain('<foreignObject x="0" y="0" width="100" height="60"');
    expect(markup).toContain("Track error");
    expect(markup).toContain("overflow:auto");
    expect(markup).toContain("Failed to load");
  });

  it("keeps error text within short tracks", () => {
    const module = defineTrackModule({
      type: "short-error-test",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: () => null },
    });
    const track = module.create({
      base: {
        id: "short-error",
        title: "Short error",
        height: 10,
      },
      config: {},
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    const markup = renderToStaticMarkup(
      <RegistryProvider registry={trackStore.getState().registry}>
        <TrackContent
          track={track}
          dataState={{ status: "error", error: "Failed to load" }}
          visibleRegion={region}
          region={region}
          width={100}
          height={track.base.height}
        />
      </RegistryProvider>,
    );

    expect(markup).not.toContain("<svg");
    expect(markup).toContain("font:10px sans-serif");
    expect(markup).toContain('height="10"');
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
        base: {
          id: "interactive",
          title: "Interactive",
        },
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
            visibleRegion={region}
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
      base: {
        id: "tooltip",
        title: "Tooltip",
      },
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
                visibleRegion={region}
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

  it("wires settings components to the browser stores", () => {
    let baseTitle: string | undefined;
    let configUrl: string | undefined;
    let interactionOnClick: unknown;
    let updateModule: TrackSettingsProps<{ url: string }>["updateTrack"] | undefined;
    function ModuleSettings({ track, updateTrack }: TrackSettingsProps<{ url: string }>) {
      baseTitle = track.base.title;
      configUrl = track.config.url;
      interactionOnClick = track.interaction?.onClick;
      updateModule = updateTrack;
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
        base: {
          id: "settings",
          title: "Settings",
        },
        config: { url: "YOUR_URL_HERE" },
      },
      { onClick },
    );
    const browserStore = createBrowserStore({ assembly: hg38, region });
    const contextMenuStore = createContextMenuStore();
    const settingsStore = createSettingsStore();
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

    expect(baseTitle).toBe(track.base.title);
    expect(configUrl).toBe(track.config.url);
    expect(interactionOnClick).toBe(onClick);

    expect(updateModule?.({ base: { title: "Updated" } })).toEqual({ ok: true });
    expect(
      updateModule?.({
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
