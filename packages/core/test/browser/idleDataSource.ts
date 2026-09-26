import type { BrowserDataSource } from "../../src/browser/state/browserContextState";

/** A data source for components rendered outside a browser: no results, no base-pair detail. */
export const idleDataSource: BrowserDataSource = {
  subscribe: () => () => {},
  getTrack: () => ({ status: "loading" }),
  getBasePairDetail: () => false,
  getBasePairDetailStatus: () => ({
    reason: "viewport",
    zoomTargetBases: null,
    maxReadableBases: 0,
  }),
};
