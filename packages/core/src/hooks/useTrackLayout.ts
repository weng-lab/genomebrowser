import { useBrowserStore, useTrackStore } from "../store/BrowserContext";

export function useTotalHeight() {
  const titleSize = useBrowserStore((state) => state.titleSize);
  const getTotalHeight = useTrackStore((state) => state.getTotalHeight);
  return getTotalHeight(titleSize);
}

export function usePrevHeights(id: string) {
  const titleSize = useBrowserStore((state) => state.titleSize);
  const getPrevHeights = useTrackStore((state) => state.getPrevHeights);
  return getPrevHeights(id, titleSize);
}

export function useDistances(id: string) {
  const titleSize = useBrowserStore((state) => state.titleSize);
  const getDistances = useTrackStore((state) => state.getDistances);
  return getDistances(id, titleSize);
}

export function useWrapperDimensions(id: string) {
  const titleSize = useBrowserStore((state) => state.titleSize);
  const getDimensions = useTrackStore((state) => state.getDimensions);
  return getDimensions(id, titleSize);
}
