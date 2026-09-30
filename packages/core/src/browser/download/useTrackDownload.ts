import { useEffect, useRef, useState } from "react";
import { useBrowserSvg } from "../svg/browserSvgState";
import { useDataController, useGenomeBrowser } from "../state/browserContextState";
import type { TrackStore } from "../state/trackStore";
import { createTrackSvg, saveTrackImage, svgToPng } from "./trackImage";

export type TrackImageFormat = "svg" | "png";

export type TrackDownloadOptions = {
  /** Include the first displayed ruler above the selected track. Defaults to false. */
  includeRuler?: boolean;
};

export type TrackDownload = {
  /** True while this hook is preparing an image. */
  isDownloading: boolean;
  /** Most recent failure, cleared when another download starts. */
  error: string | null;
  /** Selected track if it is a ruler, otherwise the first ruler in display order, or null. */
  rulerTrackId: string | null;
  /** Resolves true when a download is initiated, false on failure or cancellation. */
  download(format: TrackImageFormat, options?: TrackDownloadOptions): Promise<boolean>;
};

/** Export a rendered track in the nearest GenomeBrowser. */
export function useTrackDownload(trackId: string): TrackDownload {
  const svg = useBrowserSvg();
  const { useBrowserStore, useTrackStore } = useGenomeBrowser();
  const rulerTrackId = useTrackStore((state) => findRulerTrack(state, trackId));
  const dataController = useDataController();
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
  }, [trackId, svg, useBrowserStore, useTrackStore]);

  const download = async (format: TrackImageFormat, options: TrackDownloadOptions = {}) => {
    if (active.current) return false;
    const controller = new AbortController();
    active.current = controller;
    setIsDownloading(true);
    setError(null);
    let unsubscribe: (() => void) | undefined;
    try {
      if (format !== "svg" && format !== "png") throw new Error("Choose SVG or PNG.");
      const state = useTrackStore.getState();
      const track = state.getTrack(trackId);
      if (!track || !svg?.isConnected) throw new Error("The track is not currently rendered.");
      const rulerId = options.includeRuler ? findRulerTrack(state, trackId) : null;
      if (options.includeRuler && !rulerId)
        throw new Error("Add a ruler track before including it in the image.");
      const ids = rulerId && rulerId !== trackId ? [rulerId, trackId] : [trackId];
      const tracks = ids.map((id) => state.getTrack(id)!);
      if (
        useBrowserStore.getState().isLoading ||
        ids.some((id) => dataController.getTrack(id).status === "loading")
      ) {
        throw new Error("Wait for the track to finish loading before downloading.");
      }
      if (ids.some((id) => dataController.getTrack(id).status === "error")) {
        throw new Error("Resolve the track data error before downloading.");
      }
      // Either included track changing invalidates a pending PNG.
      unsubscribe = useTrackStore.subscribe((next) => {
        if (tracks.some((included) => next.getTrack(included.base.id) !== included))
          controller.abort();
      });
      const { chromosome, start, end } = useBrowserStore.getState().region;
      const snapshot = createTrackSvg(svg, ids);
      const blob = format === "svg" ? snapshot.blob : await svgToPng(snapshot, controller.signal);
      controller.signal.throwIfAborted();
      const name = `${track.base.title || trackId}_${chromosome}_${start + 1}-${end}`
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .slice(0, 180);
      saveTrackImage(blob, `${name}.${format}`);
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Track download failed.");
      }
      return false;
    } finally {
      unsubscribe?.();
      if (active.current === controller) {
        active.current = null;
        setIsDownloading(false);
      }
    }
  };

  return { download, isDownloading, error, rulerTrackId };
}

function findRulerTrack(state: TrackStore, trackId: string): string | null {
  const selected = state.getTrack(trackId);
  if (selected && state.registry.get(selected.type).isRuler) return trackId;
  return (
    state.order.find((id) => {
      const track = state.getTrack(id);
      return track && state.registry.get(track.type).isRuler;
    }) ?? null
  );
}
