import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGenomeBrowser } from "../state/browserContextState";
import { createTrackLayouts, getTrackWrapperHeight } from "./trackLayout";

/** Derive ordered rows and the SVG height from the current track store. */
export function useTrackLayout(titleSize: number) {
  const { useTrackStore } = useGenomeBrowser();
  const trackIds = useTrackStore((state) => state.order);
  const wrapperHeights = useTrackStore(
    useShallow((state) => state.tracks.map((track) => getTrackWrapperHeight(track, titleSize))),
  );
  const trackLayouts = useMemo(
    () => createTrackLayouts(trackIds, wrapperHeights, 0),
    [trackIds, wrapperHeights],
  );
  const totalHeight = Math.max(
    1,
    wrapperHeights.reduce((total, height) => total + height, 0),
  );
  return { trackLayouts, totalHeight };
}
