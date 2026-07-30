// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { BrowserProvider, InteractionGateProvider } from "../../src/browser/state/BrowserContext";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { TrackFrame } from "../../src/browser/track-row/TrackFrame";
import { hg38 } from "../../src/genome/presets";
import { defineTrackModule } from "../../src/modules/defineTrackModule";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const marginWidth = 120;
const trackWidth = 500;
const module = defineTrackModule({
  type: "frame-hover-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: () => null },
});
const track = module.create({ id: "test", title: "Test track", config: {} });

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
});

describe("track frame hover highlight", () => {
  it("shows only while the pointer is within the left margin", async () => {
    const onDataHover = vi.fn();
    const onSwapMouseDown = vi.fn();
    const settingsStore = createSettingsStore();
    await renderFrame({ onDataHover, onSwapMouseDown, settingsStore });

    const margin = marginRect();
    const title = requiredElement("text");
    const data = requiredElement('[data-testid="data-area"]');
    const settingsControl = requiredElement("circle", margin.parentElement).parentElement;
    if (!settingsControl) throw new Error("Settings control not found");

    expect(highlight()).toBeNull();

    await dispatchMouse(margin, "mouseover");
    expect(highlight()?.style.pointerEvents).toBe("none");

    await dispatchMouse(margin, "mouseout", settingsControl);
    await dispatchMouse(settingsControl, "mouseover", margin);
    expect(highlight()).not.toBeNull();

    await dispatchMouse(settingsControl, "mouseout", title);
    await dispatchMouse(title, "mouseover", settingsControl);
    expect(highlight()).toBeNull();

    await dispatchMouse(data, "mousemove");
    expect(onDataHover).toHaveBeenCalledOnce();
    expect(highlight()).toBeNull();

    await dispatchMouse(margin, "mousedown");
    expect(onSwapMouseDown).toHaveBeenCalledOnce();

    await dispatchMouse(settingsControl, "mousedown");
    await dispatchMouse(settingsControl, "click");
    expect(onSwapMouseDown).toHaveBeenCalledOnce();
    expect(settingsStore.getState()).toMatchObject({ open: true, trackId: track.base.id });
  });

  it("keeps the margin highlight disabled for swap previews", async () => {
    await renderFrame({ disableHover: true });

    await dispatchMouse(marginRect(), "mouseover");

    expect(highlight()).toBeNull();
  });
});

async function renderFrame({
  disableHover = false,
  onDataHover,
  onSwapMouseDown,
  settingsStore = createSettingsStore(),
}: {
  disableHover?: boolean;
  onDataHover?: () => void;
  onSwapMouseDown?: (event: React.MouseEvent<SVGRectElement>) => void;
  settingsStore?: ReturnType<typeof createSettingsStore>;
}) {
  const browserStore = createBrowserStore({
    assembly: hg38,
    region: { chromosome: "chr1", start: 1, end: 100 },
  });
  const trackStore = createTrackStore({ modules: [module], tracks: [track] });
  const contextMenuStore = createContextMenuStore();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () =>
    root?.render(
      <BrowserProvider value={{ browserStore, trackStore, contextMenuStore, settingsStore }}>
        <InteractionGateProvider value={{ isInteractionBlocked: false }}>
          <svg>
            <TrackFrame
              track={track}
              y={0}
              marginWidth={marginWidth}
              trackWidth={trackWidth}
              titleSize={12}
              disableHover={disableHover}
              onSwapMouseDown={onSwapMouseDown}
            >
              <rect
                data-testid="data-area"
                width={trackWidth}
                height={track.base.height}
                onMouseMove={onDataHover}
              />
            </TrackFrame>
          </svg>
        </InteractionGateProvider>
      </BrowserProvider>,
    ),
  );
}

function marginRect() {
  return requiredElement(`rect[x="0"][width="${marginWidth}"][fill="#ffffff"]`);
}

function highlight() {
  return container?.querySelector<SVGRectElement>('rect[fill-opacity="0.25"]') ?? null;
}

function requiredElement<E extends Element = SVGElement>(
  selector: string,
  parent: ParentNode | null | undefined = container,
) {
  const element = parent?.querySelector<E>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
}

async function dispatchMouse(element: Element, type: string, relatedTarget?: EventTarget) {
  await act(async () =>
    element.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget })),
  );
}
