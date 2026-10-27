// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  defineTrackModule,
  useBrowserDownload,
  type BrowserDownload,
  type BrowserStoreInstance,
  type TrackRendererProps,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mounted: { root: Root; container: HTMLDivElement }[] = [];
const blobs: Blob[] = [];
const saved: string[] = [];
let api: BrowserDownload;
let image: { onload: (() => void) | null; onerror: (() => void) | null; src: string };
let canvasSize: number[] = [];

function Renderer({ id }: TrackRendererProps<Record<string, never>, null>) {
  return (
    <g>
      <defs>
        <clipPath id={`clip-${id}`}>
          <rect data-cull="referenced" width={10} height={10} />
        </clipPath>
      </defs>
      <rect data-feature={id} width={100} height={20} fill="#123456" />
      <rect data-cull="offscreen" x={-5000} width={100} height={20} fill="#654321" />
    </g>
  );
}

const module = defineTrackModule({
  type: "browser-export-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: Renderer },
});

// Lives outside the GenomeBrowser tree, like an application toolbar.
function Toolbar({ browserStore }: { browserStore: BrowserStoreInstance }) {
  api = useBrowserDownload(browserStore);
  return null;
}

beforeEach(() => {
  blobs.length = 0;
  saved.length = 0;
  canvasSize = [];
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL(blob: Blob) {
        blobs.push(blob);
        return `blob:export-${blobs.length}`;
      }
      static revokeObjectURL = vi.fn();
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      saved.push(this.download);
    },
  );
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      constructor() {
        image = this;
      }
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    function (this: HTMLCanvasElement, callback) {
      canvasSize = [this.width, this.height];
      callback(new Blob(["png"], { type: "image/png" }));
    },
  );
});

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount({ withBrowser = true } = {}) {
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    marginWidth: 100,
    trackWidth: 800,
    titleSize: 10,
    highlights: [{ id: "peak", region: { start: 1200, end: 1400 }, color: "#ff0000" }],
  });
  const useTrackStore = createTrackStore({
    modules: [module],
    tracks: [
      module.create({ base: { id: "first", title: "First", height: 40 }, config: {} }),
      module.create({ base: { id: "second", title: "Second", height: 60 }, config: {} }),
    ],
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () =>
    root.render(
      <>
        <Toolbar browserStore={useBrowserStore} />
        {withBrowser && (
          <GenomeBrowser
            sizing="fixed"
            scale={1.5}
            browserStore={useBrowserStore}
            trackStore={useTrackStore}
          />
        )}
      </>,
    ),
  );
  const svg = container.querySelector<SVGSVGElement>("#browserSVG");
  const height = svg ? Number(svg.getAttribute("viewBox")!.split(" ")[3]) : 0;
  return { root, container, useBrowserStore, useTrackStore, height };
}

function text(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("whole-browser image downloads from outside the browser tree", () => {
  it("saves every track and the highlights at logical size, without margin controls", async () => {
    const { height } = await mount();
    await act(async () => {
      expect(await api.download("svg")).toBe(true);
    });
    expect(saved).toEqual(["genome-browser_chr1_1001-2000.svg"]);
    const document = new DOMParser().parseFromString(await text(blobs[0]), "image/svg+xml");
    const root = document.documentElement;
    expect(root.getAttribute("width")).toBe("800");
    expect(root.getAttribute("height")).toBe(String(height));
    expect(root.getAttribute("viewBox")).toBe(`100 0 800 ${height}`);
    expect(document.querySelector('[data-track-id="first"]')).not.toBeNull();
    expect(document.querySelector('[data-track-id="second"]')).not.toBeNull();
    expect(
      document.querySelectorAll('[data-feature="first"], [data-feature="second"]'),
    ).toHaveLength(2);
    expect(document.querySelector('rect[fill="#ff0000"]')).not.toBeNull();
    expect(document.querySelector("[data-track-export-exclude]")).toBeNull();
    expect(api.error).toBeNull();
  });

  it("encodes PNG at the requested scale and keeps the region captured at click time", async () => {
    const { useBrowserStore, height } = await mount();
    let result: Promise<boolean>;
    await act(async () => {
      result = api.download("png", { scale: 2 });
    });
    expect(api.isDownloading).toBe(true);
    await act(async () =>
      useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 4000, end: 5000 }),
    );
    await act(async () => {
      image.onload?.();
      expect(await result!).toBe(true);
    });
    expect(canvasSize).toEqual([1600, Math.ceil(height * 2)]);
    expect(saved).toEqual(["genome-browser_chr1_1001-2000.png"]);
    expect(api.isDownloading).toBe(false);
  });

  it("rejects PNGs beyond browser canvas limits before decoding", async () => {
    await mount();
    await act(async () => {
      expect(await api.download("png", { scale: 50 })).toBe(false);
    });
    expect(api.error).toContain("too large for PNG");
    expect(blobs).toHaveLength(0);
    expect(saved).toHaveLength(0);
  });

  it("cancels a pending PNG when a track is removed", async () => {
    const { useTrackStore } = await mount();
    let result: Promise<boolean>;
    await act(async () => {
      result = api.download("png");
    });
    await act(async () => {
      expect(await api.download("svg")).toBe(false);
    });
    await act(async () => useTrackStore.getState().removeTrack("second"));
    expect(await result!).toBe(false);
    expect(saved).toHaveLength(0);
    expect(api.error).toBeNull();
  });

  it("reports loading tracks and a browser that is not mounted", async () => {
    const { useBrowserStore } = await mount();
    await act(async () => useBrowserStore.setState({ isLoading: true }));
    await act(async () => {
      expect(await api.download("svg")).toBe(false);
    });
    expect(api.error).toContain("finish loading");

    await mount({ withBrowser: false });
    await act(async () => {
      expect(await api.download("svg")).toBe(false);
    });
    expect(api.error).toContain("not currently rendered");
    expect(saved).toHaveLength(0);
  });
  it("drops painted elements outside the exported width but keeps referenced definitions", async () => {
    await mount();
    // jsdom has no layout, so supply client boxes: the browser is 900 units at scale 1.5.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const [left, right] =
          this.id === "browserSVG"
            ? [0, 1350]
            : this.hasAttribute("data-cull")
              ? [-300, -200]
              : [200, 300];
        return { left, right, width: right - left, top: 0, bottom: 10, height: 10 } as DOMRect;
      },
    );
    await act(async () => {
      expect(await api.download("svg")).toBe(true);
    });
    const document = new DOMParser().parseFromString(await text(blobs[0]), "image/svg+xml");
    expect(document.querySelectorAll("[data-feature]")).toHaveLength(2);
    expect(document.querySelector('[data-cull="offscreen"]')).toBeNull();
    expect(document.querySelectorAll('[data-cull="referenced"]')).toHaveLength(2);
  });

  it("reports an image too large to serialize instead of saving an empty file", async () => {
    await mount();
    vi.spyOn(XMLSerializer.prototype, "serializeToString").mockReturnValue("");
    await act(async () => {
      expect(await api.download("svg")).toBe(false);
    });
    expect(api.error).toContain("too large to export");
    expect(saved).toHaveLength(0);
  });
});
