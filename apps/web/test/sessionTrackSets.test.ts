import { expect, it } from "vitest";
import { createStores } from "../features/assemblies/assemblies";
import { sessionSnapshotSchema } from "../features/sessions/snapshot";
import { restore, snapshot } from "../features/sessions/storeSnapshot";

it("round-trips track sets alongside metadata and saved-region groups, clearing older-session state", () => {
  const stores = createStores("hg38")!;
  const legacy = snapshot(stores);
  stores.useTrackStore
    .getState()
    .createTrackSet({ id: "annotations", title: "Annotations", trackIds: ["genes", "ccres"] });
  stores.useTrackStore.getState().setTrackVisibility("ccres", false);
  stores.useTrackStore
    .getState()
    .updateTrackSet("annotations", { visible: false, allowTrackTransfer: false });
  stores.useTrackStore.getState().updateTrack("genes", {
    metadata: { Source: "GENCODE", Selected: false, Priority: 2, Note: null },
  });
  stores.useBrowserStore.getState().addHighlight({
    id: "promoter",
    name: "Promoter",
    region: { chromosome: "chr12", start: 53372922, end: 53373922 },
    color: "#123456",
    hidden: true,
  });
  stores.useRegionGroupStore.getState().addToNewGroup("promoter", {
    name: "Saved regions",
    color: "#123456",
  });
  const saved = snapshot(stores);
  expect(saved).toMatchObject({
    trackSets: [
      {
        id: "annotations",
        title: "Annotations",
        trackIds: ["genes", "ccres"],
        visible: false,
        allowTrackTransfer: false,
      },
    ],
    hiddenTrackIds: ["ccres"],
    tracks: expect.arrayContaining([
      expect.objectContaining({
        base: expect.objectContaining({ id: "genes" }),
        metadata: { Source: "GENCODE", Selected: false, Priority: 2, Note: null },
      }),
    ]),
    browser: {
      highlights: [expect.objectContaining({ id: "promoter", name: "Promoter", hidden: true })],
    },
    regionGroups: [expect.objectContaining({ name: "Saved regions", regionIds: ["promoter"] })],
  });
  const restored = createStores("hg38")!;
  restore(restored, sessionSnapshotSchema.parse(JSON.parse(JSON.stringify(saved))));
  expect(snapshot(restored)).toEqual(saved);
  expect(
    restored.useTrackStore.getState().moveTrackItem({ kind: "track", id: "genes" }, {}),
  ).toMatchObject({ ok: false, code: "INTERACTION_BLOCKED" });
  restore(restored, legacy);
  expect(restored.useTrackStore.getState().trackSets).toEqual([]);
  expect(restored.useTrackStore.getState().hiddenTrackIds).toEqual([]);
  expect(restored.useRegionGroupStore.getState().groups).toEqual([]);
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
