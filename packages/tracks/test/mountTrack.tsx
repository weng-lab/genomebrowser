import { act, useSyncExternalStore, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { onTestFinished } from "vitest";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  type AnyTrackModule,
  type AssemblyDefinition,
  type GenomicRegion,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser";

type TrackStoreState = ReturnType<ReturnType<typeof createTrackStore>["getState"]>;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
// jsdom has no SVG geometry. The browser's tooltip only needs a box to place itself.
Object.defineProperty(SVGElement.prototype, "getBBox", {
  configurable: true,
  value: () => ({ x: 0, y: 0, width: 100, height: 20 }),
});

/** The parts of a first-party track module the harness reads. */
type HostedModule = {
  create: (input: never, interaction?: never) => unknown;
  fetch: (context: never) => Promise<unknown>;
  render: Record<string, unknown>;
  tooltipComponent?: unknown;
};

let mounts = 0;

export type MountTrackOptions<M extends HostedModule> = {
  module: M;
  /** Input to `module.create`; `base.display` picks the renderer. */
  track: Parameters<M["create"]>[0];
  /** Delivered through the track's public `interaction` field. */
  interaction?: Parameters<M["create"]>[1];
  /** Literal result for every fetch. Omit to run the module's real `fetch`. */
  data?: Awaited<ReturnType<M["fetch"]>>;
  /** Region the renderer draws; also the browser region unless `visibleRegion` is set. */
  region: GenomicRegion;
  visibleRegion?: GenomicRegion;
  /** Renderer and track width in pixels. */
  width?: number;
  assembly?: AssemblyDefinition;
};

/**
 * Mounts a track module in a real `GenomeBrowser` and settles its fetch.
 * The renderer receives exactly `region`, `visibleRegion`, and `width`, so
 * pixel expectations follow from those literals rather than core's overscan.
 */
export async function mountTrack<M extends HostedModule>({
  module,
  track,
  interaction,
  data,
  region,
  visibleRegion = region,
  width = 1000,
  assembly = { id: "test", chromosomes: { [region.chromosome]: 248_956_422 } },
}: MountTrackOptions<M>) {
  const mountId = String(++mounts);
  let started = 0;
  let pending = 0;
  let tooltipItem: unknown;
  // The view the renderer is pinned to and the data fetches return; `setView` replaces it.
  let view = { data, region, visibleRegion, width };
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const fetch = (context: never) => {
    started++;
    pending++;
    const result = view.data === undefined ? module.fetch(context) : Promise.resolve(view.data);
    return result.finally(() => pending--);
  };
  const render = Object.fromEntries(
    Object.entries(
      module.render as Record<string, ComponentType<TrackRendererProps<unknown, unknown>>>,
    ).map(([display, Renderer]) => [
      display,
      function MountedRenderer(props: TrackRendererProps<unknown, unknown>) {
        const pinned = useSyncExternalStore(subscribe, () => view);
        return (
          <g data-mounted-track="">
            <Renderer
              {...props}
              region={pinned.region}
              visibleRegion={pinned.visibleRegion}
              width={pinned.width}
            />
          </g>
        );
      },
    ]),
  );
  // Tooltips portal to the document body, so mark this mount's content to tell mounts apart.
  const Tooltip = module.tooltipComponent as ComponentType<{ item: unknown }> | undefined;
  const tooltipComponent =
    Tooltip &&
    ((props: { item: unknown }) => {
      tooltipItem = props.item;
      return (
        <g data-mounted-tooltip={mountId}>
          <Tooltip {...props} />
        </g>
      );
    });
  const tooltip = () => document.querySelector(`[data-mounted-tooltip="${mountId}"]`);
  const hosted = { ...module, fetch, render, tooltipComponent } as unknown as AnyTrackModule;
  const browserStore = createBrowserStore({ assembly, region: visibleRegion, trackWidth: width });
  const instance = hosted.create(track, interaction);
  const trackStore = createTrackStore({ modules: [hosted], tracks: [instance] });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  /**
   * Applies an update, then waits until every fetch has settled. React only commits
   * when an `act` scope closes, so each wait is its own scope: the first commits the
   * update and starts fetching, and the last commits what the fetches delivered.
   * The 20 ms step outlasts the animation frame the browser shows a tooltip on.
   */
  async function settle(update: () => unknown = () => {}, fetches = started) {
    await act(async () => {
      update();
    });
    for (let tries = 0; tries < 100; tries++) {
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 20);
        });
      });
      if (pending === 0 && started >= fetches) return;
    }
    throw new Error("Track fetch did not settle");
  }
  /** Fires a pointer event and returns the text of the tooltip then showing ("" if none). */
  async function pointer(type: string, element: Element, point?: MouseEventInit) {
    await settle(() => element.dispatchEvent(new MouseEvent(type, { bubbles: true, ...point })));
    return tooltip()?.textContent ?? "";
  }
  await settle(() =>
    root.render(
      <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
    ),
  );
  // Tooltip anchoring maps client points through the SVG transform jsdom lacks.
  const svg = container.querySelector<SVGSVGElement>("#browserSVG")!;
  const point = { x: 0, y: 0, matrixTransform: () => ({ x: point.x, y: point.y }) };
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => matrix };
  Object.assign(svg, { createSVGPoint: () => point, getScreenCTM: () => matrix });

  let unmounted = false;
  async function unmount() {
    if (unmounted) return;
    unmounted = true;
    await act(async () => root.unmount());
    container.remove();
  }
  // Every mount cleans itself up, so suites need no afterEach.
  onTestFinished(unmount);

  return {
    container,
    /** What the track's renderer drew, without browser chrome such as the title. */
    get content() {
      const content = container.querySelector("[data-mounted-track]");
      if (!content) throw new Error(`Track did not render: ${container.textContent}`);
      return content;
    },
    browserStore,
    trackStore,
    settle,
    /** The track height the browser stores and lays the track out with. */
    get height() {
      return trackStore.getState().getTrack(instance.base.id)?.base.height;
    },
    /** Updates the track through the browser's track store, as its settings do. */
    update: (patch: Parameters<TrackStoreState["updateTrack"]>[1]) =>
      settle(() => trackStore.getState().updateTrack(instance.base.id, patch)),
    /** The tooltip the browser is showing for this track, or null. */
    get tooltip() {
      return tooltip();
    },
    /** The item the browser handed that tooltip; any custom `tooltipComponent` receives it. */
    get tooltipItem() {
      return tooltip() ? tooltipItem : undefined;
    },
    /** Each returns the tooltip text the browser shows afterwards ("" if none). */
    hover: (element: Element) => pointer("mouseover", element),
    move: (element: Element, point: { clientX: number; clientY?: number }) =>
      pointer("mousemove", element, point),
    leave: (element: Element) => pointer("mouseout", element),
    click: (element: Element) => pointer("click", element),
    /**
     * Pans or resizes the mounted track. The browser's region and width follow, as they
     * do for `region`, `visibleRegion`, and `width`. `data` sets what the next fetch
     * returns; the renderer only sees it once core fetches, as it does after a pan past
     * the loaded data, so pass it with such a pan or mount a new view.
     */
    async setView(
      next: Partial<Pick<MountTrackOptions<M>, "data" | "region" | "visibleRegion" | "width">>,
    ) {
      // Core refetches a resize only after a debounce, so wait for that fetch to start.
      const resized = next.width !== undefined && next.width !== view.width;
      await settle(
        () => {
          view = {
            ...view,
            ...next,
            visibleRegion: next.visibleRegion ?? next.region ?? view.visibleRegion,
          };
          browserStore.getState().setRegion(view.visibleRegion);
          browserStore.getState().setTrackWidth(view.width);
          for (const listener of listeners) listener();
        },
        started + Number(resized),
      );
    },
    /** Opens the track's settings from its settings button and returns the dialog. */
    async openSettings() {
      const button = container.querySelector('[role="button"][aria-label^="Settings for"]');
      if (!button) throw new Error("Track has no settings button");
      await pointer("click", button);
      const dialog = container.querySelector("dialog");
      if (!dialog) throw new Error("Settings did not open");
      return dialog;
    },
    unmount,
  };
}

export type MountedTrack = Awaited<ReturnType<typeof mountTrack>>;
