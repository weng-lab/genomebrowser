import type { ReactNode } from "react";
import { BrowserProvider } from "../../src/browser/state/BrowserContext";
import { createBrowserStore } from "../../src/browser/state/browserStore";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { RegistryProvider } from "../../src/browser/state/RegistryContext";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import type { TrackStoreInstance } from "../../src/browser/state/trackStore";
import { hg38 } from "../../src/genome/presets";

export function TrackSettingsTestProvider({
  children,
  trackId,
  trackStore,
}: {
  children: ReactNode;
  trackId: string;
  trackStore: TrackStoreInstance;
}) {
  const settingsStore = createSettingsStore();
  settingsStore.getState().openSettings(trackId, { x: 0, y: 0 });

  return (
    <BrowserProvider
      value={{
        browserStore: createBrowserStore({
          assembly: hg38,
          region: { chromosome: "chr1", start: 0, end: 10 },
        }),
        contextMenuStore: createContextMenuStore(),
        settingsStore,
        trackStore,
      }}
    >
      <RegistryProvider registry={trackStore.getState().registry}>{children}</RegistryProvider>
    </BrowserProvider>
  );
}
