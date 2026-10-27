import type { BrowserDataSource } from "../state/browserContextState";
import type { BrowserStoreInstance } from "../state/browserStore";
import type { TrackStoreInstance } from "../state/trackStore";

/** What a whole-browser export needs from a mounted GenomeBrowser. */
export type MountedBrowser = {
  svg: SVGSVGElement;
  trackStore: TrackStoreInstance;
  dataController: BrowserDataSource;
};

// Hosts hold the browser store outside the GenomeBrowser tree, so key mounts by it.
const mounted = new WeakMap<BrowserStoreInstance, MountedBrowser>();

export function registerMountedBrowser(
  browserStore: BrowserStoreInstance,
  browser: MountedBrowser,
) {
  mounted.set(browserStore, browser);
  return () => {
    if (mounted.get(browserStore) === browser) mounted.delete(browserStore);
  };
}

export function getMountedBrowser(browserStore: BrowserStoreInstance) {
  return mounted.get(browserStore);
}
