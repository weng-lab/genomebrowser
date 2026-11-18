import { act, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserStore,
  createTrackStore,
  GenomeBrowser,
  type AnyTrackModule,
  type AssemblyDefinition,
  type GenomicRegion,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser";

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
  /** Literal fetch result. Omit to run the module's real `fetch`. */
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
  let pending = 0;
  const fetch = (context: never) => {
    pending++;
    const result = data === undefined ? module.fetch(context) : Promise.resolve(data);
    return result.finally(() => pending--);
  };
  const render = Object.fromEntries(
    Object.entries(
      module.render as Record<string, ComponentType<TrackRendererProps<unknown, unknown>>>,
    ).map(([display, Renderer]) => [
      display,
      (props: TrackRendererProps<unknown, unknown>) => (
        <g data-mounted-track="">
          <Renderer {...props} region={region} visibleRegion={visibleRegion} width={width} />
        </g>
      ),
    ]),
  );
  // Tooltips portal to the document body, so mark this mount's content to tell mounts apart.
  const Tooltip = module.tooltipComponent as ComponentType<Record<string, unknown>> | undefined;
  const tooltipComponent =
    Tooltip &&
    ((props: Record<string, unknown>) => (
      <g data-mounted-tooltip={mountId}>
        <Tooltip {...props} />
      </g>
    ));
  const hosted = { ...module, fetch, render, tooltipComponent } as unknown as AnyTrackModule;
  const browserStore = createBrowserStore({ assembly, region: visibleRegion, trackWidth: width });
  const trackStore = createTrackStore({
    modules: [hosted],
    tracks: [hosted.create(track, interaction as never)],
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  /**
   * Applies an update, then waits until every fetch has settled. React only commits
   * when an `act` scope closes, so each wait is its own scope: the first commits the
   * update and starts fetching, and the last commits what the fetches delivered.
   */
  async function settle(update: () => unknown = () => {}) {
    await act(async () => {
      update();
    });
    for (let tries = 0; tries < 100; tries++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      if (pending === 0) return;
    }
    throw new Error("Track fetch did not settle");
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
    /** Hovers an element and returns the text of the tooltip the browser shows ("" if none). */
    async hover(element: Element) {
      await settle(() => element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
      return document.querySelector(`[data-mounted-tooltip="${mountId}"]`)?.textContent ?? "";
    },
    async click(element: Element) {
      await settle(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

export type MountedTrack = Awaited<ReturnType<typeof mountTrack>>;
