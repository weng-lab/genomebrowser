// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { TrackControls } from "../../src/browser/track-row/TrackControls";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

it("disables pinned move controls and moves other tracks only within the unpinned stack", async () => {
  const module = defineTrackModule({
    type: "custom",
    configSchema: z.object({}),
    fetch: async () => null,
    render: { full: () => null },
  });
  const tracks = ["a", "b", "c", "d"].map((id) => module.create({ id, title: id, config: {} }));
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks,
    pinnedTrackIds: ["missing", "b", "a"],
  });
  const browserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 1000 } },
    region: { chromosome: "chr1", start: 0, end: 100 },
  });
  const context = {
    browserStore,
    trackStore: useTrackStore,
    settingsStore: createSettingsStore(),
    contextMenuStore: createContextMenuStore(),
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <BrowserProvider value={context}>
        <InteractionGateProvider value={{ isInteractionBlocked: false }}>
          <svg>
            {tracks.map((track) => (
              <g key={track.base.id} data-track={track.base.id}>
                <TrackControls track={track} marginWidth={100} wrapperHeight={80} />
              </g>
            ))}
          </svg>
        </InteractionGateProvider>
      </BrowserProvider>,
    );
  });
  const control = (id: string, position: number) => {
    const element = container?.querySelector(`[data-track="${id}"] > g`)?.children[
      position
    ] as SVGGElement;
    if (!element) throw new Error("Control not found");
    return element;
  };
  for (const id of ["a", "b"]) {
    expect(control(id, 1).style.cursor).toBe("default");
    expect(control(id, 2).style.cursor).toBe("default");
    await act(async () => {
      control(id, 2).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }
  expect(useTrackStore.getState().order).toEqual(["b", "a", "c", "d"]);
  expect(control("c", 1).style.cursor).toBe("default");
  expect(control("d", 1).style.cursor).toBe("pointer");
  await act(async () => {
    control("d", 1).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(useTrackStore.getState().order).toEqual(["b", "a", "d", "c"]);
  expect(control("d", 1).style.cursor).toBe("default");
  await act(async () => {
    useTrackStore.getState().setPinnedTrackIds([]);
  });
  expect(control("a", 1).style.cursor).toBe("pointer");
  expect(control("b", 2).style.cursor).toBe("pointer");
});
