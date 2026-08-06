import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  BrowserProvider,
  InteractionGateProvider,
} from "../../core/src/browser/state/BrowserContext";
import { createBrowserStore } from "../../core/src/browser/state/browserStore";
import { createContextMenuStore } from "../../core/src/browser/state/contextMenuStore";
import { RegistryProvider } from "../../core/src/browser/state/RegistryContext";
import { createSettingsStore } from "../../core/src/browser/state/settingsStore";
import type { TrackStoreInstance } from "../../core/src/browser/state/trackStore";
import { hg38 } from "../../core/src/genome/presets";
import type { TrackMutationResult, TrackUpdate } from "@weng-lab/genomebrowser";

export function TrackSettingsTestProvider({
  children,
  trackId,
  trackStore,
  updateTrack,
}: {
  children: ReactNode;
  trackId: string;
  trackStore: TrackStoreInstance;
  updateTrack?: (update: TrackUpdate<unknown>) => TrackMutationResult;
}) {
  const stores = useMemo(() => {
    const settingsStore = createSettingsStore();
    settingsStore.getState().openSettings(trackId, { x: 0, y: 0 });

    if (updateTrack) {
      trackStore.setState({
        updateTrack: (_id, update) => updateTrack(update),
      });
    }

    return {
      browserStore: createBrowserStore({
        assembly: hg38,
        region: { chromosome: "chr1", start: 0, end: 10 },
      }),
      contextMenuStore: createContextMenuStore(),
      settingsStore,
      trackStore,
    };
  }, [trackId, trackStore, updateTrack]);

  return (
    <BrowserProvider value={stores}>
      <InteractionGateProvider value={{ isInteractionBlocked: false }}>
        <RegistryProvider registry={trackStore.getState().registry}>{children}</RegistryProvider>
      </InteractionGateProvider>
    </BrowserProvider>
  );
}
