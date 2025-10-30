import { useEffect, useMemo, useState } from "react";
import { reverseXTransform, xtransform } from "../components/tracks/bigwig/helpers";
import { useBrowserStore, useDataStore } from "../store/BrowserContext";
import { Domain } from "../utils/types";

export function useXTransform(totalWidth: number) {
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const [domain, setDomain] = useState<Domain>(getExpandedDomain());
  const isFetching = useDataStore((state) => state.isFetching);

  useEffect(() => {
    if (!isFetching) {
      setDomain(getExpandedDomain());
    }
  }, [isFetching, getExpandedDomain]);

  const x = useMemo(() => {
    return xtransform(domain, totalWidth);
  }, [totalWidth, domain]);

  const reverseX = useMemo(() => {
    return reverseXTransform(domain, totalWidth);
  }, [totalWidth, domain]);

  return { x, reverseX };
}
