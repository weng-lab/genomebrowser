import { useEffect, useRef, useState } from "react";
import type { BrowserStoreInstance } from "../state/browserStore";
import { getMountedBrowser } from "./browserRegistry";
import { createBrowserSvg, saveTrackImage, svgToPng } from "./trackImage";
import type { TrackImageFormat } from "./useTrackDownload";

export type BrowserDownloadOptions = {
  /** PNG pixels per browser unit. Defaults to 1. Ignored for SVG. */
  scale?: number;
};

export type BrowserDownload = {
  /** True while this hook is preparing an image. */
  isDownloading: boolean;
  /** Most recent failure, cleared when another download starts. */
  error: string | null;
  /** Resolves true when a download is initiated, false on failure or cancellation. */
  download(format: TrackImageFormat, options?: BrowserDownloadOptions): Promise<boolean>;
};

/**
 * Export every rendered track of the GenomeBrowser mounted with `browserStore`.
 * Works outside the GenomeBrowser tree, such as in a host toolbar.
 */
export function useBrowserDownload(browserStore: BrowserStoreInstance): BrowserDownload {
  const active = useRef<AbortController | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsDownloading(false);
    setError(null);
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [browserStore]);

  const download = async (format: TrackImageFormat, options: BrowserDownloadOptions = {}) => {
    if (active.current) return false;
    const controller = new AbortController();
    active.current = controller;
    setIsDownloading(true);
    setError(null);
    let unsubscribe = () => {};
    try {
      if (format !== "svg" && format !== "png") throw new Error("Choose SVG or PNG.");
      const scale = options.scale ?? 1;
      if (!Number.isFinite(scale) || scale <= 0) {
        throw new Error("The PNG scale must be a positive number.");
      }
      const browser = getMountedBrowser(browserStore);
      if (!browser?.svg.isConnected)
        throw new Error("The genome browser is not currently rendered.");
      const { svg, trackStore, dataController } = browser;
      const tracks = trackStore.getState();
      const { isLoading, marginWidth, region } = browserStore.getState();
      if (
        isLoading ||
        tracks.order.some((id) => dataController.getTrack(id).status === "loading")
      ) {
        throw new Error("Wait for the tracks to finish loading before downloading.");
      }
      // Tracks with data errors are exported as rendered, with their error message.
      const snapshot = createBrowserSvg(svg, marginWidth);
      // Track changes during PNG encoding would make the pending image stale.
      unsubscribe = trackStore.subscribe((next) => {
        if (
          next.order !== tracks.order ||
          tracks.order.some((id) => next.getTrack(id) !== tracks.getTrack(id))
        ) {
          controller.abort();
        }
      });
      const blob =
        format === "svg" ? snapshot.blob : await svgToPng(snapshot, controller.signal, scale);
      controller.signal.throwIfAborted();
      const name = `genome-browser_${region.chromosome}_${region.start + 1}-${region.end}`
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .slice(0, 180);
      saveTrackImage(blob, `${name}.${format}`);
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Browser download failed.");
      }
      return false;
    } finally {
      unsubscribe();
      if (active.current === controller) active.current = null;
      setIsDownloading(active.current !== null);
    }
  };

  return { download, isDownloading, error };
}
