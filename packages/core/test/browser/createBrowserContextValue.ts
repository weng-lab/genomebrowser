import type {
  BrowserContextValue,
  BrowserDataSource,
} from "../../src/browser/state/browserContextState";
import type { BrowserStoreInstance } from "../../src/browser/state/browserStore";
import type { TrackStoreInstance } from "../../src/browser/state/trackStore";
import { createContextMenuStore } from "../../src/browser/state/contextMenuStore";
import { createSettingsStore } from "../../src/browser/state/settingsStore";
import { createTooltipStore } from "../../src/browser/tooltip/tooltipStore";

/** Supply context to isolated tests without connecting a production data controller. */
export function createBrowserContextValue(
  browserStore: BrowserStoreInstance,
  trackStore: TrackStoreInstance,
  dataController: BrowserDataSource,
): BrowserContextValue {
  return {
    browserStore,
    trackStore,
    dataController,
    contextMenuStore: createContextMenuStore(),
    settingsStore: createSettingsStore(),
    tooltipStore: createTooltipStore(),
  };
}
