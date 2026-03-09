import { useMemo } from "react";
import { buildTrackFrameLayoutData } from "../components/tracks/frame/frameLayout";
import { useBrowserStore, useTrackStore } from "../store/BrowserContext";

export function useTotalHeight() {
  const browserTitleSize = useBrowserStore((state) => state.titleSize);
  const tracks = useTrackStore((state) => state.tracks);

  return useMemo(() => buildTrackFrameLayoutData(tracks, browserTitleSize).totalHeight, [browserTitleSize, tracks]);
}
