import type { GenomicRegion } from "../../genome/region";
import type { BrowserStoreInstance } from "../state/browserStore";
import { getMountedBrowser } from "./browserRegistry";
import { createBrowserSvg, saveTrackImage, svgToPng } from "./trackImage";
import type { TrackImageFormat } from "./useTrackDownload";

export type BrowserDownloadOptions = {
  /** PNG pixels per browser unit. Defaults to 1. Ignored for SVG. */
  scale?: number;
  /** Include each track's title. Defaults to true. */
  includeTitles?: boolean;
  /** Include ruler tracks. Defaults to true. */
  includeRuler?: boolean;
  /** File name without its extension. Defaults to the region's name when blank. */
  filename?: string;
};

/** A prepared browser image that has not been saved. */
export type BrowserImage = {
  blob: Blob;
  format: TrackImageFormat;
  /** File name including the extension. */
  filename: string;
  /** Size in image pixels: browser units for SVG, browser units times `scale` for PNG. */
  width: number;
  height: number;
};

/**
 * Capture every rendered track of the GenomeBrowser mounted with `browserStore` as one image,
 * without saving it. Rejects with a readable message when the image cannot be made, and with
 * `signal`'s reason when it aborts. A pending PNG also aborts when the tracks change.
 */
export async function exportBrowserImage(
  browserStore: BrowserStoreInstance,
  format: TrackImageFormat,
  options: BrowserDownloadOptions = {},
  signal?: AbortSignal,
): Promise<BrowserImage> {
  signal?.throwIfAborted();
  if (format !== "svg" && format !== "png") throw new Error("Choose SVG or PNG.");
  const scale = format === "png" ? (options.scale ?? 1) : 1;
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error("The PNG scale must be a positive number.");
  }
  const browser = getMountedBrowser(browserStore);
  if (!browser?.svg.isConnected) throw new Error("The genome browser is not currently rendered.");
  const { svg, trackStore, dataController } = browser;
  const tracks = trackStore.getState();
  const { isLoading, marginWidth, region } = browserStore.getState();
  if (isLoading || tracks.order.some((id) => dataController.getTrack(id).status === "loading")) {
    throw new Error("Wait for the tracks to finish loading before downloading.");
  }
  // Tracks with data errors are exported as rendered, with their error message.
  const { registry } = tracks;
  const rulerIds = tracks.order.filter((id) => {
    const track = tracks.getTrack(id);
    return track !== undefined && registry.get(track.type).isRuler;
  });
  const snapshot = createBrowserSvg(svg, {
    marginWidth,
    omitTrackIds: new Set(options.includeRuler === false ? rulerIds : []),
    includeTitles: options.includeTitles ?? true,
  });
  const name = cleanFilename(options.filename ?? "", format) || getDefaultFilename(region);
  const image = {
    format,
    filename: `${name}.${format}`,
    width: Math.ceil(snapshot.width * scale),
    height: Math.ceil(snapshot.height * scale),
  };
  if (format === "svg") return { ...image, blob: snapshot.blob };

  // Track changes during PNG encoding would make the pending image stale.
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const unsubscribe = trackStore.subscribe((next) => {
    if (
      next.order !== tracks.order ||
      tracks.order.some((id) => next.getTrack(id) !== tracks.getTrack(id))
    ) {
      controller.abort(new Error("The tracks changed while the image was being prepared."));
    }
  });
  try {
    return { ...image, blob: await svgToPng(snapshot, controller.signal, scale) };
  } finally {
    unsubscribe();
    signal?.removeEventListener("abort", abort);
  }
}

/** Start a browser download of a prepared image. Call it from a user action. */
export function saveBrowserImage(image: BrowserImage) {
  saveTrackImage(image.blob, image.filename);
}

/** The file name, without extension, used for `region` when none is given. */
export function getDefaultFilename(region: GenomicRegion) {
  return `genome-browser_${region.chromosome}_${region.start + 1}-${region.end}`
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 180);
}

// Keep a typed name readable, but drop its extension and characters file systems reject.
function cleanFilename(filename: string, format: TrackImageFormat) {
  const name = Array.from(filename.trim().replace(new RegExp(`\\.${format}$`, "i"), ""), (char) =>
    char < " " || char === "\u007f" || '<>:"/\\|?*'.includes(char) ? "_" : char,
  ).join("");
  return name.replace(/^[\s.]+|[\s.]+$/g, "").slice(0, 180);
}
