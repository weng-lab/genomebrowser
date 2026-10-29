import type { GenomicRegion } from "../../genome/region";
import { createBrowserSvg, saveTrackImage, svgToPng } from "./trackImage";
import type { TrackImageFormat } from "./useTrackDownload";

export type BrowserDownloadOptions = {
  /** PNG pixels per browser unit. Defaults to 1. Ignored for SVG. */
  scale?: number;
  /** Include each track's title. Defaults to true. */
  includeTitles?: boolean;
  /** Include ruler tracks. Defaults to true. */
  includeRuler?: boolean;
  /** File name without its extension. Defaults to "genome-browser" when blank. */
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
 * Capture every track rendered in `svg`, a GenomeBrowser's `svgRef`, as one image without
 * saving it. The image shows the tracks as rendered, so wait for them to finish loading.
 * Rejects with a readable message when the image cannot be made, and with `signal`'s reason
 * when it aborts.
 */
export async function exportBrowserImage(
  svg: SVGSVGElement | null,
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
  if (!svg?.isConnected) throw new Error("The genome browser is not currently rendered.");
  // Tracks with data errors are exported as rendered, with their error message.
  const snapshot = createBrowserSvg(svg, {
    includeRuler: options.includeRuler ?? true,
    includeTitles: options.includeTitles ?? true,
  });
  const name = cleanFilename(options.filename ?? "", format) || "genome-browser";
  const image = {
    format,
    filename: `${name}.${format}`,
    width: Math.ceil(snapshot.width * scale),
    height: Math.ceil(snapshot.height * scale),
  };
  if (format === "svg") return { ...image, blob: snapshot.blob };
  return {
    ...image,
    blob: await svgToPng(snapshot, signal ?? new AbortController().signal, scale),
  };
}

/** Start a browser download of a prepared image. Call it from a user action. */
export function saveBrowserImage(image: BrowserImage) {
  saveTrackImage(image.blob, image.filename);
}

/** The file name, without extension, used for `region` when none is given. */
export function getDefaultImageFilename(region: GenomicRegion) {
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
