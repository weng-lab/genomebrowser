import { expect, it } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import type { SessionSnapshot } from "../features/sessions/snapshot";
import { observeSnapshot, snapshot } from "../features/sessions/storeSnapshot";

it("observes persistent edits synchronously, ignores loading, and stops observing on cleanup", () => {
  const stores = createStores("hg38")!;
  const captured: SessionSnapshot[] = [];
  const stop = observeSnapshot(stores, () => captured.push(snapshot(stores)));
  try {
    expect(captured).toEqual([]);
    stores.useBrowserStore.setState({ isLoading: true });
    stores.useBrowserStore.setState({ isLoading: false });
    expect(captured).toEqual([]);

    stores.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 100, end: 200 });
    expect(captured).toHaveLength(1);
    expect(captured[0].browser.region).toEqual({ chromosome: "chr1", start: 100, end: 200 });

    stores.useTrackStore.getState().updateTrack("ruler", { base: { title: "Coordinates edited" } });
    expect(captured).toHaveLength(2);
    expect(captured[1].tracks[0].base.title).toBe("Coordinates edited");

    stores.useTrackStore.getState().setPinnedTrackIds(["ccres"]);
    expect(captured).toHaveLength(3);
    expect(captured[2].pinnedTrackIds).toEqual(["ccres"]);
    expect(captured[2].tracks.map(({ base }) => base.id)).toEqual(["ccres", "ruler", "genes"]);

    stop();
    stop();
    stores.useBrowserStore.getState().setRegion({ chromosome: "chr1", start: 300, end: 400 });
    stores.useTrackStore.getState().removeTrack("genes");
    expect(captured).toHaveLength(3);
  } finally {
    stop();
  }
});
