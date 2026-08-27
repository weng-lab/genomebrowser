// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GenomeBrowser } from "../../src/browser/GenomeBrowser";
import type { DataState } from "../../src/browser/data/types";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { RegistryProvider } from "../../src/browser/state/RegistryContext";
import { createTrackStore } from "../../src/browser/state/trackStore";
import { TrackContent } from "../../src/browser/track-row/TrackContent";
import { hg38 } from "../../src/genome/presets";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import type { AnyTrackInstance } from "../../src/modules/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const trackRenderErrorPrefix = "[genomebrowser] Track render error";
const renderError = new Error("private renderer exception");

function ThrowingRenderer(): never {
  throw renderError;
}

function HealthyRenderer() {
  return <rect data-testid="healthy-renderer" width={100} height={20} />;
}

const throwingModule = defineTrackModule({
  type: "throwing-render-test",
  configSchema: z.object({ secret: z.string() }),
  fetch: async () => ({ privateData: "private fetched data" }),
  render: { full: ThrowingRenderer },
});

const healthyModule = defineTrackModule({
  type: "healthy-render-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: HealthyRenderer },
});

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  container = undefined;
  root = undefined;
  vi.restoreAllMocks();
});

describe("track render error isolation", () => {
  it("contains a throwing renderer within its track frame and logs safe context", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const brokenTrack = throwingModule.create({
      id: "broken-track",
      title: "Broken track",
      height: 64,
      config: { secret: "private track config" },
    });
    const healthyTrack = healthyModule.create({
      id: "healthy-track",
      title: "Healthy track",
      height: 48,
      config: {},
    });
    const browserStore = createBrowserStore({
      assembly: hg38,
      region: { chromosome: "chr1", start: 1, end: 1000 },
      marginWidth: 120,
      trackWidth: 500,
      titleSize: 12,
    });
    const trackStore = createTrackStore({
      modules: [throwingModule, healthyModule],
      tracks: [brokenTrack, healthyTrack],
    });

    await render(<GenomeBrowser browserStore={browserStore} trackStore={trackStore} />);

    const svg = requiredElement<SVGSVGElement>("#browserSVG");
    const fallbackText = requiredText("Track unavailable: Broken track");
    const brokenTitle = requiredText("Broken track");
    const brokenFrame = brokenTitle.parentElement;
    if (!brokenFrame) throw new Error("Broken track frame not found");

    expect(container?.textContent).not.toContain(renderError.message);
    expect(requiredElement('[data-testid="healthy-renderer"]')).toBeTruthy();
    expect(requiredText("Healthy track")).toBeTruthy();
    expect(brokenFrame.getAttribute("transform")).toBe("translate(0,80)");
    expect(brokenFrame.querySelector('rect[x="120"][y="0"][height="81"]')).toBeTruthy();
    expect(brokenFrame.querySelectorAll('svg[viewBox="0 0 24 24"]')).toHaveLength(3);
    expect(brokenFrame.querySelector("g[clip-path]")?.contains(fallbackText)).toBe(true);
    expect(fallbackText.parentElement?.parentElement?.firstElementChild?.tagName).toBe("rect");
    expect(requiredText("Healthy track").parentElement?.getAttribute("transform")).toBe(
      "translate(0,161)",
    );
    expect(svg.getAttribute("viewBox")).toBe("0 0 620 226");
    expect(svg.querySelector('rect[x="120"][y="0"][width="500"][height="80"]')).toBeTruthy();

    await act(async () => browserStore.getState().zoom(0.5));
    expect(browserStore.getState().region).toEqual({ chromosome: "chr1", start: 251, end: 751 });
    expect(requiredElement("#browserSVG")).toBe(svg);
    expect(requiredElement('[data-testid="healthy-renderer"]')).toBeTruthy();
    expect(requiredText("Track unavailable: Broken track")).toBeTruthy();

    const customLog = consoleError.mock.calls.find(
      ([message]) => message === trackRenderErrorPrefix,
    );
    expect(customLog?.[1]).toEqual({
      track: {
        id: "broken-track",
        type: "throwing-render-test",
        display: "full",
        title: "Broken track",
      },
      error: renderError,
      componentStack: expect.stringContaining("ThrowingRenderer"),
    });
    expect(JSON.stringify(customLog?.[1])).not.toContain("private track config");
    expect(JSON.stringify(customLog?.[1])).not.toContain("private fetched data");
  });

  it("keeps loading, fetch-error, and unsupported-display states explicit", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const renderer = vi.fn(HealthyRenderer);
    const module = defineTrackModule({
      type: "expected-state-test",
      configSchema: z.object({}),
      fetch: async () => null,
      render: { full: renderer },
    });
    const track = module.create({ id: "expected", title: "Expected states", config: {} });
    const unsupportedTrack: AnyTrackInstance = {
      ...track,
      base: { ...track.base, id: "unsupported", display: "missing" },
    };
    const trackStore = createTrackStore({ modules: [module], tracks: [track] });

    await render(
      <RegistryProvider registry={trackStore.getState().registry}>
        <svg>
          <TrackState track={track} dataState={{ status: "loading" }} />
          <TrackState
            track={track}
            dataState={{ status: "error", error: "Expected fetch failure" }}
          />
          <TrackState track={unsupportedTrack} dataState={{ status: "success", data: null }} />
        </svg>
      </RegistryProvider>,
    );

    expect(requiredElement("animateTransform")).toBeTruthy();
    expect(requiredText("Expected fetch failure")).toBeTruthy();
    expect(
      requiredText('Display "missing" is not supported by "expected-state-test"'),
    ).toBeTruthy();
    expect(renderer).not.toHaveBeenCalled();
    expect(consoleError.mock.calls.some(([message]) => message === trackRenderErrorPrefix)).toBe(
      false,
    );
  });
});

function TrackState({ track, dataState }: { track: AnyTrackInstance; dataState: DataState }) {
  return (
    <g>
      <TrackContent
        track={track}
        dataState={dataState}
        visibleRegion={{ chromosome: "chr1", start: 0, end: 100 }}
        region={{ chromosome: "chr1", start: 0, end: 100 }}
        width={100}
        height={track.base.height}
      />
    </g>
  );
}

async function render(children: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(children);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function requiredText(content: string) {
  const element = Array.from(container?.querySelectorAll("text") ?? []).find(
    (candidate) => candidate.textContent === content,
  );
  if (!element) throw new Error(`Text not found: ${content}`);
  return element;
}

function requiredElement<E extends Element = Element>(selector: string) {
  const element = container?.querySelector<E>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
}
