import { useEffect, useMemo, useState } from "react";
import { xtransform } from "../components/tracks/bigwig/helpers";
import { useBrowserStore } from "../store/browserStore";
import { useDataStore } from "../store/dataStore";
import { Domain } from "../utils/types";

export function useXTransform(totalWidth: number) {
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const [domain, setDomain] = useState<Domain>(getExpandedDomain());
  const fetching = useDataStore((state) => state.fetching);

  useEffect(() => {
    if (fetching == false) {
      setDomain(getExpandedDomain());
    }
  }, [fetching]);

  return useMemo(() => {
    return xtransform(domain, totalWidth);
  }, [totalWidth, domain]);
}
