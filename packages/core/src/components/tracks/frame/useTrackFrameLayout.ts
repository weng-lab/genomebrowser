import { useMemo } from "react";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";
import { buildTrackFrameLayoutData } from "./frameLayout";

export function useTrackFrameLayout(id: string) {
  const browserTitleSize = useBrowserStore((state) => state.titleSize);
  const tracks = useTrackStore((state) => state.tracks);

  return useMemo(() => {
    const { layoutById, reorderDistancesById } = buildTrackFrameLayoutData(tracks, browserTitleSize);

    return {
      layout: layoutById[id],
      reorderDistances: reorderDistancesById[id] ?? [],
    };
  }, [browserTitleSize, id, tracks]);
}
