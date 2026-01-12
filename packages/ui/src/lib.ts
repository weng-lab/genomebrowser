import TrackSelect, { type TrackSelectProps } from "./TrackSelect/TrackSelect";
export { TrackSelect, TrackSelectProps };

// Export config factory and types
import {
  createBiosampleConfig,
  type BiosampleTrackSelectConfig,
  type GroupingModeConfig,
} from "./TrackSelect/biosample/config";
export { createBiosampleConfig, BiosampleTrackSelectConfig, GroupingModeConfig };

// Export biosample types
import type { RowInfo, Assembly } from "./TrackSelect/biosample";
export { type RowInfo, type Assembly };

// Keep store exports for backwards compatibility if needed
import {
  createSelectionStore,
  type SelectionStoreInstance,
} from "./TrackSelect/store.ts";
export { createSelectionStore, SelectionStoreInstance };
