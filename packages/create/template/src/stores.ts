import {
  createBrowserStore,
  createSettingsStore,
  createTrackStore,
  hg38,
  parseRegion,
} from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { TrackBaseSettings } from "@weng-lab/genomebrowser-tracks/shared";

// Store names begin with "use" because components also use them as React hooks.

// Default initialization for the browser region, assembly and dimensions.
// Track width will change as you resize the application as well.
export const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: parseRegion("chr12:53,372,922-53,423,700"),
  marginWidth: 50,
  trackWidth: 1450,
});

// The track store is defaulted to allow any first party track modules.
// Add your custom modules in this list to expand support.
export const myModules = [...firstPartyTrackModules];
export const useTrackStore = createTrackStore({
  modules: myModules,
  // TrackPicker loads the startup tracks from src/collections.ts.
  tracks: [],
});

export const useSettingsStore = createSettingsStore({
  baseSettingsComponent: TrackBaseSettings,
});
