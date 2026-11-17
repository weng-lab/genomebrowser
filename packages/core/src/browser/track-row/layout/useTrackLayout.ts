import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { TrackStore } from "../../state/trackStore";
import { useGenomeBrowser } from "../../state/browserContextState";
import { indexTrackSets, isTrackVisible } from "../../state/trackSets";
import { createTrackStackLayouts, getTrackWrapperHeight } from "./trackLayout";

/** Subscribe only to values that affect row geometry, not titles or fetched data. */
export function useTrackLayout(titleSize: number) {
  const { useTrackStore } = useGenomeBrowser();
  const trackIds = useTrackStore((state) => state.order);
  const wrapperHeights = useTrackStore(
    useShallow((state) => state.tracks.map((track) => getTrackWrapperHeight(track, titleSize))),
  );
  const trackSetIds = useTrackStore(
    useShallow((state) => {
      const byTrackId = indexTrackSets(state.trackSets);
      return state.order.map((id) => byTrackId.get(id)?.id);
    }),
  );
  const visible = useTrackStore(
    useShallow((state) =>
      state.order.map((id) => isTrackVisible(id, state.trackSets, state.hiddenTrackIds)),
    ),
  );

  return useMemo(
    () => createTrackStackLayouts(trackIds, wrapperHeights, trackSetIds, visible),
    [trackIds, wrapperHeights, trackSetIds, visible],
  );
}

/** Read the same layout on pointer-down without adding live drag subscriptions. */
export function getTrackLayoutSnapshot(state: TrackStore, titleSize: number) {
  const byTrackId = indexTrackSets(state.trackSets);
  return createTrackStackLayouts(
    state.order,
    state.tracks.map((track) => getTrackWrapperHeight(track, titleSize)),
    state.order.map((id) => byTrackId.get(id)?.id),
    state.order.map((id) => isTrackVisible(id, state.trackSets, state.hiddenTrackIds)),
  );
}
