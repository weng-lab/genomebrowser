import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGenomeBrowser } from "../../state/browserContextState";
import { findTrackSet, isTrackVisible } from "../../state/trackSets";
import {
  getTrackWrapperHeight,
  TRACK_SET_HEADER_HEIGHT,
  type TrackLayout,
  type TrackSetLayout,
} from "./trackLayout";

/** Derive rows from flat track order; group membership never copies track instances. */
export function useTrackLayout(titleSize: number) {
  const { useTrackStore } = useGenomeBrowser();
  const trackIds = useTrackStore((state) => state.order);
  const wrapperHeights = useTrackStore(
    useShallow((state) => state.tracks.map((track) => getTrackWrapperHeight(track, titleSize))),
  );
  const setIds = useTrackStore(
    useShallow((state) => state.order.map((id) => findTrackSet(id, state.trackSets)?.id)),
  );
  const visible = useTrackStore(
    useShallow((state) =>
      state.order.map((id) => isTrackVisible(id, state.trackSets, state.hiddenTrackIds)),
    ),
  );
  return useMemo(() => {
    const trackLayouts: TrackLayout[] = [];
    const trackSetLayouts: TrackSetLayout[] = [];
    const seen = new Set<string>();
    let y = 0;
    trackIds.forEach((id, index) => {
      const setId = setIds[index];
      if (setId && !seen.has(setId)) {
        seen.add(setId);
        trackSetLayouts.push({ id: setId, y });
        y += TRACK_SET_HEADER_HEIGHT;
      }
      if (!visible[index]) return;
      const wrapperHeight = wrapperHeights[index] ?? 0;
      trackLayouts.push({ id, index, y, wrapperHeight });
      y += wrapperHeight;
    });
    return { trackLayouts, trackSetLayouts, totalHeight: Math.max(1, y) };
  }, [trackIds, wrapperHeights, setIds, visible]);
}
