import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SettingsModalController } from "../../src/browser/overlays/SettingsModalController";
import type { BaseSettingsProps } from "../../src/browser/settings/types";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { RegistryProvider } from "../../src/browser/state/RegistryContext";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { TrackContent } from "../../src/browser/track-row/TrackContent";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { useInteraction } from "../../src/modules/interaction";
import type { TrackRendererProps, TrackSettingsProps } from "../../src/modules/types";

describe("browser module wiring", () => {
  const region = { chromosome: "chr1", start: 0, end: 10 };

  it("provides instance interactions to module renderers", () => {
    type Item = { id: string };
    let rendererInteraction = false;
    const onClick = () => undefined;

    function Renderer(_props: TrackRendererProps<{ url: string }, null>) {
      rendererInteraction = useInteraction<Item>()?.onClick === onClick;
      return null;
    }

    const module = defineTrackModule<Item>()({
      type: "interactive-test",
      configSchema: z.object({ url: z.string().min(1) }),
      fetch: async () => null,
      render: { full: Renderer },
    });
    const track = module.create({
      id: "interactive",
      title: "Interactive",
      url: "YOUR_URL_HERE",
      onClick,
    });
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    renderToStaticMarkup(
      <RegistryProvider registry={trackStore.getState().registry}>
        <TrackContent
          track={track}
          dataState={{ status: "success", data: null }}
          region={region}
          width={100}
          height={80}
          titleMargin={0}
        />
      </RegistryProvider>,
    );

    expect(rendererInteraction).toBe(true);
  });

  it("wires settings base updates separately from module config updates", () => {
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
    const track = module.create({
      id: "settings",
      title: "Settings",
      url: "YOUR_URL_HERE",
    });
    const browserStore = createBrowserStore({ region });
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
    expect(moduleProps?.id).toBe("settings");
    expect(moduleProps?.config).toEqual(track.config);

    expect(baseProps?.updateBase({ title: "Updated" })).toEqual({ ok: true });
    expect(moduleProps?.updateConfig({ url: "YOUR_OTHER_URL_HERE" })).toEqual({ ok: true });
    expect(trackStore.getState().getTrack("settings")).toMatchObject({
      base: { title: "Updated" },
      config: { url: "YOUR_OTHER_URL_HERE" },
    });
  });
});
