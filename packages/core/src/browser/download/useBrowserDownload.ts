import { useEffect, useRef, useState } from "react";
import type { BrowserStoreInstance } from "../state/browserStore";
import {
  exportBrowserImage,
  getDefaultFilename,
  saveBrowserImage,
  type BrowserDownloadOptions,
} from "./browserImage";
import type { TrackImageFormat } from "./useTrackDownload";

export type BrowserDownload = {
  /** True while this hook is preparing an image. */
  isDownloading: boolean;
  /** Most recent failure, cleared when another download starts. */
  error: string | null;
  /** Name, without extension, used when no `filename` is given. Follows the current region. */
  defaultFilename: string;
  /** Resolves true when a download is initiated, false on failure or cancellation. */
  download(format: TrackImageFormat, options?: BrowserDownloadOptions): Promise<boolean>;
};

/**
 * Export every rendered track of the GenomeBrowser mounted with `browserStore`.
 * Works outside the GenomeBrowser tree, such as in a host toolbar.
 */
export function useBrowserDownload(browserStore: BrowserStoreInstance): BrowserDownload {
  const useBrowserStore = browserStore;
  const defaultFilename = useBrowserStore((state) => getDefaultFilename(state.region));
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
    try {
      const image = await exportBrowserImage(browserStore, format, options, controller.signal);
      controller.signal.throwIfAborted();
      saveBrowserImage(image);
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Browser download failed.");
      }
      return false;
    } finally {
      if (active.current === controller) active.current = null;
      setIsDownloading(active.current !== null);
    }
  };

  return { download, isDownloading, error, defaultFilename };
}
