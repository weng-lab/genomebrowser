import { useMemo, useState, type ReactNode } from "react";
import {
  createBrowserStore,
  createTrackStore,
  type BrowserStoreInstance,
  type TrackStoreInstance,
} from "@weng-lab/genomebrowser";
import { BrowserProvider } from "../../core/src/browser/state/BrowserContext";
import { createBrowserContextValue } from "../../core/src/browser/state/browserContextState";

// Stable snapshots: useSyncExternalStore re-renders whenever a snapshot changes identity.
const readyStatus = { reason: "ready", zoomTargetBases: 100, maxReadableBases: 125 } as const;
const viewportStatus = { reason: "viewport", zoomTargetBases: 100, maxReadableBases: 125 } as const;

/**
 * Hosts a renderer or settings panel outside a mounted browser. `basePairDetail`
 * sets the browser's base-pair detail gate; there are no track results.
 */
export function TestBrowser({
  basePairDetail = false,
  browserStore,
  trackStore,
  children,
}: {
  basePairDetail?: boolean;
  browserStore?: BrowserStoreInstance;
  trackStore?: TrackStoreInstance;
  children: ReactNode;
}) {
  const [defaultBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: { id: "test", chromosomes: { chr1: 10000 } },
      region: { chromosome: "chr1", start: 0, end: 1000 },
    }),
  );
  const [emptyTrackStore] = useState(() => createTrackStore({ modules: [], tracks: [] }));
  const context = useMemo(
    () =>
      createBrowserContextValue(
        browserStore ?? defaultBrowserStore,
        trackStore ?? emptyTrackStore,
        {
          subscribe: () => () => {},
          getTrack: () => ({ status: "loading" }),
          getBasePairDetail: () => basePairDetail,
          getBasePairDetailStatus: () => (basePairDetail ? readyStatus : viewportStatus),
        },
        () => false,
      ),
    [basePairDetail, browserStore, defaultBrowserStore, emptyTrackStore, trackStore],
  );
  return <BrowserProvider value={context}>{children}</BrowserProvider>;
}
