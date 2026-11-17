import { expect, it } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { sessionSnapshotSchema } from "../features/sessions/snapshot";
import { restore, snapshot } from "../features/sessions/storeSnapshot";

it("round-trips groups and child visibility and clears them when restoring an older session", () => {
  const stores = createStores("hg38")!;
  const legacy = snapshot(stores);
  stores.useTrackStore
    .getState()
    .createTrackSet({ id: "annotations", title: "Annotations", trackIds: ["genes", "ccres"] });
  stores.useTrackStore.getState().setTrackVisibility("ccres", false);
  stores.useTrackStore.getState().updateTrackSet("annotations", { visible: false });
  const saved = snapshot(stores);
  expect(saved).toMatchObject({
    trackSets: [
      { id: "annotations", title: "Annotations", trackIds: ["genes", "ccres"], visible: false },
    ],
    hiddenTrackIds: ["ccres"],
  });
  const restored = createStores("hg38")!;
  restore(restored, sessionSnapshotSchema.parse(JSON.parse(JSON.stringify(saved))));
  expect(snapshot(restored)).toEqual(saved);
  restore(restored, legacy);
  expect(restored.useTrackStore.getState().trackSets).toEqual([]);
  expect(restored.useTrackStore.getState().hiddenTrackIds).toEqual([]);
  expect(snapshot(restored)).toEqual(legacy);
});

it("rejects invalid saved group membership before altering live browser stores", () => {
  const stores = createStores("hg38")!;
  const original = snapshot(stores);
  const group = { id: "annotations", title: "Annotations", trackIds: ["genes"], visible: true };
  expect(sessionSnapshotSchema.safeParse({ ...original, trackSets: [group] }).success).toBe(true);
  for (const trackSets of [
    [{ ...group, trackIds: ["missing"] }],
    [{ ...group, id: "genes" }],
    [{ ...group, trackIds: ["genes", "genes"] }],
    [group, { ...group, id: "other" }],
    [group, { ...group, trackIds: ["ccres"] }],
  ])
    expect(sessionSnapshotSchema.safeParse({ ...original, trackSets }).success).toBe(false);
  expect(
    sessionSnapshotSchema.safeParse({ ...original, hiddenTrackIds: ["missing"] }).success,
  ).toBe(false);
  const bad = {
    ...original,
    browser: { ...original.browser, region: { chromosome: "chr1", start: 1, end: 100 } },
    trackSets: [{ ...group, trackIds: ["missing"] }],
  };
  expect(() => restore(stores, bad)).toThrow();
  expect(snapshot(stores)).toEqual(original);
});
