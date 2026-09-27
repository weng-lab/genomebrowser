import { useLayoutEffect, useState, type ReactNode } from "react";
import { createTrackDataController } from "../data/trackDataController";
import { BrowserContext, createBrowserContextValue } from "./browserContextState";
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
  const [runtime, setRuntime] = useState(() => {
    const dataController = createTrackDataController({ browserStore, trackStore, trackWidth });
    const panDragStatus = { isDragging: false };
    return {
      dataController,
      context: createBrowserContextValue(browserStore, trackStore, dataController, panDragStatus),
    };
  });
  const { dataController, context } = runtime;

  // A new supplied store pair needs a new controller before descendants render.
  // Keep this mount's menu, settings, tooltip, and drag status across replacement.
  if (context.browserStore !== browserStore || context.trackStore !== trackStore) {
    const nextController = createTrackDataController({ browserStore, trackStore, trackWidth });
    setRuntime({
      dataController: nextController,
      context: { ...context, browserStore, trackStore, dataController: nextController },
    });
  }

  useLayoutEffect(() => dataController.connect(), [dataController]);
  useLayoutEffect(() => dataController.setTrackWidth(trackWidth), [dataController, trackWidth]);
  return <BrowserContext.Provider value={context}>{children}</BrowserContext.Provider>;
}
