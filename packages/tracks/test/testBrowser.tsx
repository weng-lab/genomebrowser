import {
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  GenomeBrowser,
  type AnyTrackInstance,
  type AnyTrackModule,
  type BrowserStoreInstance,
} from "@weng-lab/genomebrowser";
import { act, createContext, use, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach } from "vitest";
import { z } from "zod";

const HostedContent = createContext<ReactNode>(null);

const hostModule = defineTrackModule({
  type: "test-host",
  configSchema: z.object({}),
  fetch: async () => null,
  render: {
    full: function HostedContentRenderer() {
      return <g data-test-host="">{use(HostedContent)}</g>;
    },
  },
});

type TestBrowserOptions = {
  /** Show a 100 bp view, inside the base-pair detail cutoff, instead of a 1 kb view outside it. */
  basePairDetail?: boolean;
  browserStore?: BrowserStoreInstance;
};

/**
 * Mounts a real GenomeBrowser whose only track draws `children` inside its SVG,
 * so a renderer runs with the browser's context. The host track loads
 * asynchronously; mount it with {@link renderInTestBrowser}.
 */
function TestBrowser({
  basePairDetail = false,
  browserStore,
  children,
}: TestBrowserOptions & { children: ReactNode }) {
  const [defaultBrowserStore] = useState(() => createTestBrowserStore(basePairDetail));
  const [trackStore] = useState(() =>
    createTrackStore({
      modules: [hostModule],
      tracks: [hostModule.create({ base: { id: "test-host", title: "Test host" }, config: {} })],
    }),
  );
  return (
    <HostedContent value={children}>
      <GenomeBrowser
        sizing="fixed"
        browserStore={browserStore ?? defaultBrowserStore}
        trackStore={trackStore}
      />
    </HostedContent>
  );
}

function createTestBrowserStore(basePairDetail = false) {
  return createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 0, end: basePairDetail ? 100 : 1000 },
    trackWidth: 1000,
  });
}

const unmounts = new Set<() => void>();
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts.clear();
});

/**
 * Renders `node` in a {@link TestBrowser} once its host track has loaded.
 * `host` is the SVG group holding `node`; call `render` inside `act` to draw
 * other content in the same browser. The browser unmounts after the test.
 */
export async function renderInTestBrowser(node: ReactNode, options: TestBrowserOptions = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (content: ReactNode) =>
    root.render(<TestBrowser {...options}>{content}</TestBrowser>);
  const unmount = () => {
    act(() => root.unmount());
    container.remove();
    unmounts.delete(unmount);
  };
  unmounts.add(unmount);
  await act(async () => render(node));
  const host = container.querySelector("[data-test-host]");
  if (!host) throw new Error("The test browser did not render its host track");
  return { container, host, render, unmount };
}

/**
 * Mounts `track` in a real GenomeBrowser and opens its settings dialog, as a
 * person would. The module loads no data, so the browser settles at once and
 * its controls are enabled. Edits go through the browser's own store binding.
 */
export async function openTrackSettings(
  module: AnyTrackModule,
  track: AnyTrackInstance,
  { browserStore = createTestBrowserStore() }: { browserStore?: BrowserStoreInstance } = {},
) {
  const offlineModule = {
    ...module,
    fetch: async () => {
      throw new Error("Settings tests load no track data");
    },
  };
  const trackStore = createTrackStore({ modules: [offlineModule], tracks: [track] });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const unmount = () => {
    act(() => root.unmount());
    container.remove();
    unmounts.delete(unmount);
  };
  unmounts.add(unmount);
  await act(async () =>
    root.render(
      <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
    ),
  );
  const settingsButton = container.querySelector(`[aria-label="Settings for ${track.base.title}"]`);
  if (!settingsButton) throw new Error(`No settings control for ${track.base.title}`);
  await act(async () => settingsButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const dialog = document.querySelector("dialog[open]");
  if (!dialog) throw new Error("The settings dialog did not open");
  return { browserStore, dialog, trackStore, unmount };
}
