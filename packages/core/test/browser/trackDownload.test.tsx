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
  useTrackDownload,
  TrackOverlay,
  type TrackDownload,
  type TrackRendererProps,
  type TrackSettingsProps,
} from "../../src/lib";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mounted: { root: Root; container: HTMLDivElement }[] = [];
const blobs: Blob[] = [];
const saved: { filename: string; href: string }[] = [];
let api: TrackDownload;
let image: HTMLImageElement;
const revoke = vi.fn<(url: string) => void>();

function Controls({ track }: TrackSettingsProps<Record<string, never>>) {
  api = useTrackDownload(track.base.id);
  return <span>Custom settings</span>;
}

function Renderer({ color, id }: TrackRendererProps<Record<string, never>, null>) {
  return (
    <g>
      <defs>
        <linearGradient id={`gradient-${id}`}>
          <stop stopColor={color} />
        </linearGradient>
      </defs>
      <rect data-feature={id} width={100} height={20} fill={`url(#gradient-${id})`} />
      <text x={5} y={15} style={{ fill: color, fontSize: 13 }}>
        Feature {id}
      </text>
      <TrackOverlay>
        <text x={2} y={30}>
          Overlay {id}
        </text>
      </TrackOverlay>
    </g>
  );
}
const module = defineTrackModule({
  type: "export-test",
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: Renderer },
  settingsComponent: Controls,
});

const rulerModule = defineTrackModule({
  type: "coordinate-axis",
  isRuler: true,
  configSchema: z.object({}),
  fetch: async () => null,
  render: { full: Renderer },
  settingsComponent: Controls,
});

function makeRuler(id = "reference") {
  return rulerModule.create({ base: { id, title: "Coordinate ruler", height: 30 }, config: {} });
}

beforeEach(() => {
  blobs.length = 0;
  saved.length = 0;
  revoke.mockClear();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL(blob: Blob) {
        blobs.push(blob);
        return `blob:export-${blobs.length}`;
      }
      static revokeObjectURL = revoke;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      saved.push({ filename: this.download, href: this.href });
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
  vi.useRealTimers();
});

async function mount(title = "Selected / track", id = 'selected["x"]', withRuler = false) {
  const useBrowserStore = createBrowserStore({
    assembly: { id: "test", chromosomes: { chr1: 10000 } },
    region: { chromosome: "chr1", start: 1000, end: 2000 },
    marginWidth: 100,
    trackWidth: 800,
    titleSize: 10,
  });
  const useTrackStore = createTrackStore({
    modules: [module, rulerModule],
    tracks: [
      ...(withRuler ? [makeRuler()] : []),
      module.create({ base: { id: "other", title: "Other", height: 40 }, config: {} }),
      module.create({ base: { id, title, height: 60, color: "#123456" }, config: {} }),
    ],
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () =>
    root.render(
      <GenomeBrowser
        sizing="fixed"
        scale={1.5}
        browserStore={useBrowserStore}
        trackStore={useTrackStore}
      />,
    ),
  );
  const button = [...container.querySelectorAll("[aria-label]")].find(
    (element) => element.getAttribute("aria-label") === `Settings for ${title}`,
  )!;
  await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  return { root, container, useBrowserStore, useTrackStore, id };
}

function text(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function installPngBoundary(height = 75) {
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      constructor() {
        image = this as unknown as HTMLImageElement;
      }
    },
  );
  const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    function (this: HTMLCanvasElement, callback) {
      expect([this.width, this.height]).toEqual([800, height]);
      callback(new Blob(["png"], { type: "image/png" }));
    },
  );
  return { drawImage };
}

describe("track image downloads through the public hook and settings", () => {
  it("keeps the ruler unchecked by default and stacks it directly above the selected track when checked", async () => {
    const { container, id } = await mount(undefined, undefined, true);
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.checked).toBe(false);
    const button = container.querySelector<HTMLButtonElement>(
      '[aria-label="Download track as SVG"]',
    )!;
    await act(async () => button.click());
    expect(await text(blobs[0])).not.toContain("Coordinate ruler (full)");
    await act(async () => checkbox.click());
    await act(async () => button.click());
    const svg = new DOMParser().parseFromString(
      await text(blobs[1]),
      "image/svg+xml",
    ).documentElement;
    const rows = [...svg.querySelectorAll("[data-track-id]")];
    expect(rows.map((row) => row.getAttribute("data-track-id"))).toEqual(["reference", id]);
    expect(rows[0].getAttribute("transform")).toBeNull();
    expect(rows[1].getAttribute("transform")).toBe("translate(0,45)");
    expect(svg.getAttribute("viewBox")).toBe("100 0 800 120");
    expect(svg.getAttribute("height")).toBe("120");
    expect(svg.textContent).toContain("Coordinate ruler (full)");
    expect(svg.textContent).not.toContain("Other (full)");
    expect(svg.querySelectorAll("[clip-path]")).toHaveLength(2);
  });

  it("encodes ruler and track as one PNG with their combined height", async () => {
    installPngBoundary(120);
    const { container } = await mount(undefined, undefined, true);
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Download track as PNG"]')!.click(),
    );
    const source = await text(blobs[0]);
    expect(source).toContain("Coordinate ruler (full)");
    expect(source).toContain("Selected / track (full)");
    await act(async () => image.onload?.(new Event("load")));
    expect(saved).toHaveLength(1);
    expect(blobs[1].type).toBe("image/png");
    expect(saved[0].filename).toBe("Selected_track_chr1_1001-2000.png");
  });

  it("disables the ruler checkbox when absent and reacts to adding and removing a ruler", async () => {
    const { container, useTrackStore } = await mount();
    const checkbox = () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox().disabled).toBe(true);
    expect(checkbox().checked).toBe(false);
    await act(async () => {
      expect(await api.download("svg", { includeRuler: true })).toBe(false);
    });
    expect(api.error).toContain("Add a ruler track");
    expect(saved).toHaveLength(0);
    await act(async () => useTrackStore.getState().addTrack(makeRuler(), 0));
    expect(api.rulerTrackId).toBe("reference");
    expect(checkbox().disabled).toBe(false);
    await act(async () => checkbox().click());
    await act(async () => useTrackStore.getState().removeTrack("reference"));
    expect(api.rulerTrackId).toBeNull();
    expect(checkbox().disabled).toBe(true);
    expect(checkbox().checked).toBe(false);
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Download track as SVG"]')!.click(),
    );
    expect(saved).toHaveLength(1);
    expect(await text(blobs[0])).not.toContain("Coordinate ruler (full)");
  });

  it("uses the first ruler in display order and does not duplicate an exported ruler", async () => {
    const { container, useTrackStore } = await mount(undefined, undefined, true);
    await act(async () => useTrackStore.getState().addTrack(makeRuler("second-reference"), 0));
    expect(api.rulerTrackId).toBe("second-reference");
    await act(async () => {
      await api.download("svg", { includeRuler: true });
    });
    const combined = new DOMParser().parseFromString(await text(blobs[0]), "image/svg+xml");
    expect(combined.querySelector("[data-track-id]")?.getAttribute("data-track-id")).toBe(
      "second-reference",
    );
    const buttons = container.querySelectorAll<SVGGElement>(
      '[aria-label="Settings for Coordinate ruler"]',
    );
    await act(async () => buttons[1].dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(api.rulerTrackId).toBe("reference");
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(
      true,
    );
    await act(async () => {
      expect(await api.download("svg", { includeRuler: true })).toBe(true);
    });
    const single = new DOMParser().parseFromString(await text(blobs[1]), "image/svg+xml");
    expect(single.querySelectorAll("[data-track-id]")).toHaveLength(1);
    expect(single.documentElement.getAttribute("height")).toBe("45");
  });

  it("cancels a combined PNG when the included ruler is removed", async () => {
    installPngBoundary(120);
    const { useTrackStore } = await mount(undefined, undefined, true);
    let result: Promise<boolean>;
    await act(async () => {
      result = api.download("png", { includeRuler: true });
    });
    await act(async () => useTrackStore.getState().removeTrack("reference"));
    expect(await result!).toBe(false);
    expect(saved).toHaveLength(0);
    expect(revoke).toHaveBeenCalledWith("blob:export-1");
    expect(api.isDownloading).toBe(false);
  });

  it("does not borrow a ruler from a different browser instance", async () => {
    await mount("With ruler", "selected", true);
    await mount("Without ruler", "selected");
    expect(api.rulerTrackId).toBeNull();
    await act(async () => {
      expect(await api.download("svg", { includeRuler: true })).toBe(false);
    });
    expect(saved).toHaveLength(0);
  });

  it("saves only the selected visible plot and title, retaining clipping, SVG definitions, styles, and overlays", async () => {
    const { container, id } = await mount();
    const original = container.querySelector("svg")!.outerHTML;
    await act(async () => {
      expect(await api.download("svg")).toBe(true);
    });
    expect(saved).toEqual([
      { filename: "Selected_track_chr1_1001-2000.svg", href: "blob:export-1" },
    ]);
    expect(blobs[0].type).toContain("image/svg+xml");
    const exported = new DOMParser().parseFromString(await text(blobs[0]), "image/svg+xml");
    expect(exported.querySelector("parsererror")).toBeNull();
    const svg = exported.documentElement;
    expect(svg.getAttribute("viewBox")).toBe("100 0 800 75");
    expect(svg.getAttribute("width")).toBe("800");
    expect(svg.getAttribute("height")).toBe("75");
    expect(svg.querySelector("[data-track-id]")?.getAttribute("transform")).toBeNull();
    expect(svg.querySelector("[data-track-id]")?.getAttribute("data-track-id")).toBe(id);
    expect(svg.querySelectorAll("[data-feature]")).toHaveLength(1);
    expect(svg.querySelector("clipPath")).not.toBeNull();
    expect(svg.querySelector("linearGradient")).not.toBeNull();
    expect(svg.textContent).toContain("Selected / track (full)");
    expect(svg.textContent).toContain(`Overlay ${id}`);
    expect(svg.textContent).not.toContain("Other (full)");
    expect(svg.querySelector('[role="button"]')).toBeNull();
    expect(svg.querySelector("[data-track-export-exclude]")).toBeNull();
    expect(svg.querySelector("text")?.getAttribute("style")).toContain("#123456");
    expect(container.querySelector("svg")!.outerHTML).toBe(original);
  });

  it("uses the nearest browser when instances have the same track IDs", async () => {
    await mount("First browser", "same");
    const first = api;
    await mount("Second browser", "same");
    await act(async () => {
      await first.download("svg");
      await api.download("svg");
    });
    expect(await text(blobs[0])).toContain("First browser (full)");
    expect(await text(blobs[0])).not.toContain("Second browser (full)");
    expect(await text(blobs[1])).toContain("Second browser (full)");
  });

  it("converts PNG at logical dimensions and keeps the region captured at click time", async () => {
    const { drawImage } = installPngBoundary();
    const { useBrowserStore } = await mount();
    let result: Promise<boolean>;
    await act(async () => {
      result = api.download("png");
    });
    expect(api.isDownloading).toBe(true);
    await act(async () =>
      useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 4000, end: 5000 }),
    );
    await act(async () => {
      image.onload?.(new Event("load"));
      expect(await result!).toBe(true);
    });
    expect(drawImage).toHaveBeenCalledOnce();
    expect(blobs[1].type).toBe("image/png");
    expect(saved[0].filename).toBe("Selected_track_chr1_1001-2000.png");
    expect(revoke).toHaveBeenCalledWith("blob:export-1");
    expect(api.isDownloading).toBe(false);
  });

  it("does not allocate a source URL when image construction fails", async () => {
    await mount();
    vi.stubGlobal(
      "Image",
      class {
        constructor() {
          throw new Error("Image unavailable");
        }
      },
    );
    await act(async () => {
      expect(await api.download("png")).toBe(false);
    });
    expect(api.error).toContain("Image unavailable");
    expect(blobs).toHaveLength(0);
    expect(saved).toHaveLength(0);
    expect(api.isDownloading).toBe(false);
  });
  it("reports decode failures and permits retry without leaking the source URL", async () => {
    installPngBoundary();
    await mount();
    let result: Promise<boolean>;
    await act(async () => {
      result = api.download("png");
    });
    await act(async () => {
      image.onerror?.(new Event("error"));
      expect(await result!).toBe(false);
    });
    expect(api.error).toContain("could not be converted");
    expect(api.isDownloading).toBe(false);
    expect(saved).toHaveLength(0);
    expect(revoke).toHaveBeenCalledWith("blob:export-1");
    await act(async () => {
      expect(await api.download("svg")).toBe(true);
    });
    expect(api.error).toBeNull();
  });

  it("rejects a second simultaneous request and cancels PNG when its track is removed", async () => {
    installPngBoundary();
    const { useTrackStore, id } = await mount();
    const captured = api;
    let result: Promise<boolean>;
    await act(async () => {
      result = captured.download("png");
    });
    await act(async () => {
      expect(await captured.download("svg")).toBe(false);
    });
    await act(async () => useTrackStore.getState().removeTrack(id));
    expect(await result!).toBe(false);
    expect(saved).toHaveLength(0);
    expect(revoke).toHaveBeenCalledWith("blob:export-1");
    expect(image.src).toBe("");
  });

  it("cancels PNG when settings close", async () => {
    installPngBoundary();
    const { container } = await mount();
    let result: Promise<boolean>;
    await act(async () => {
      result = api.download("png");
    });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Close settings"]')!.click(),
    );
    expect(await result!).toBe(false);
    expect(saved).toHaveLength(0);
    expect(revoke).toHaveBeenCalledWith("blob:export-1");
  });

  it("releases settings subscriptions before a cancelled PNG finishes encoding", async () => {
    installPngBoundary();
    const { container, useTrackStore } = await mount("Pending track");
    const closeSettings = () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Close settings"]')!.click();
    await act(async () => closeSettings());

    const subscribe = useTrackStore.subscribe;
    const cleanups: ReturnType<typeof vi.fn>[] = [];
    vi.spyOn(useTrackStore, "subscribe").mockImplementation((listener) => {
      const cleanup = vi.fn(subscribe(listener));
      cleanups.push(cleanup);
      return cleanup;
    });
    await act(async () =>
      container
        .querySelector('[aria-label="Settings for Pending track"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    let finishEncoding!: BlobCallback;
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback) => {
      finishEncoding = callback;
    });
    let result!: Promise<boolean>;
    await act(async () => {
      result = api.download("png");
    });
    await act(async () => image.onload?.(new Event("load")));
    expect(api.isDownloading).toBe(true);
    await act(async () => closeSettings());
    expect(cleanups.length).toBeGreaterThan(0);
    for (const cleanup of cleanups) expect(cleanup).toHaveBeenCalledOnce();
    await act(async () => {
      finishEncoding(new Blob(["png"], { type: "image/png" }));
      expect(await result).toBe(false);
    });
    expect(saved).toHaveLength(0);
    expect(revoke).toHaveBeenCalledWith("blob:export-1");
  });
  it("reports a loading track without downloading and uses native settings buttons", async () => {
    const { container, useBrowserStore } = await mount();
    await act(async () => useBrowserStore.setState({ isLoading: true }));
    await act(async () => {
      expect(await api.download("svg")).toBe(false);
    });
    expect(api.error).toContain("finish loading");
    expect(saved).toHaveLength(0);
    const button = container.querySelector<HTMLButtonElement>(
      '[aria-label="Download track as SVG"]',
    )!;
    expect(button.matches(":disabled")).toBe(true);
    await act(async () => useBrowserStore.setState({ isLoading: false }));
    await act(async () => button.click());
    expect(saved).toHaveLength(1);
  });

  it("revokes download URLs and removes temporary anchors after repeated downloads", async () => {
    await mount();
    vi.useFakeTimers();
    await act(async () => {
      await api.download("svg");
      await api.download("svg");
    });
    expect(saved).toHaveLength(2);
    expect(document.querySelector("a[download]")).toBeNull();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(revoke).toHaveBeenCalledWith("blob:export-1");
    expect(revoke).toHaveBeenCalledWith("blob:export-2");
  });
});
