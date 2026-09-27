import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { createTrackDataController } from "../data/trackDataController";
import { createTooltipStore } from "../tooltip/tooltipStore";
import { BrowserContext } from "./browserContextState";
import { createContextMenuStore } from "./contextMenuStore";
import { createSettingsStore } from "./settingsStore";
import type { BrowserStoreInstance } from "./browserStore";
import type { TrackStoreInstance } from "./trackStore";

export function BrowserProvider({
  children,
  browserStore,
  trackStore,
  trackWidth,
}: {
  children: ReactNode;
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  trackWidth: number;
}) {
  // Private UI stores live for this mount, including across source replacement.
  const [ui] = useState(() => ({
    contextMenuStore: createContextMenuStore(),
    settingsStore: createSettingsStore(),
    tooltipStore: createTooltipStore(),
  }));
  const [source, setSource] = useState(() => ({
    browserStore,
    trackStore,
    dataController: createTrackDataController({ browserStore, trackStore, trackWidth }),
  }));

  // A new supplied store pair needs a new controller before descendants render.
  if (source.browserStore !== browserStore || source.trackStore !== trackStore) {
    setSource({
      browserStore,
      trackStore,
      dataController: createTrackDataController({ browserStore, trackStore, trackWidth }),
    });
  }

  const { dataController } = source;
  useLayoutEffect(() => dataController.connect(), [dataController]);
  useLayoutEffect(() => dataController.setTrackWidth(trackWidth), [dataController, trackWidth]);
  const context = useMemo(() => ({ ...source, ...ui }), [source, ui]);
  return <BrowserContext.Provider value={context}>{children}</BrowserContext.Provider>;
}
