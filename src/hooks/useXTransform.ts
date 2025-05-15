import { xtransform } from "../components/tracks/bigwig/helpers";
import { useBrowserStore } from "../store/browserStore";

export function useXTransform(totalWidth: number) {
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const expandedDomain = getExpandedDomain();
  return xtransform(expandedDomain, totalWidth);
}
