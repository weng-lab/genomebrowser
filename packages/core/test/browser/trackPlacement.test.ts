import { expect, it } from "vitest";
import { z } from "zod";
import { createTrackStore, defineTrackModule } from "../../src/lib";
const module = defineTrackModule({
  type: "placement",
  configSchema: z.object({ value: z.number() }),
  fetch: async () => null,
  render: { full: () => null },
});
function createStore() {
  return createTrackStore({
    modules: [module],
    tracks: ["pin", "outside", "a", "b", "c", "last"].map((id, index) =>
      module.create({ base: { id, title: id }, config: { value: index } }),
    ),
    pinnedTrackIds: ["pin"],
    hiddenTrackIds: ["b"],
    trackSets: [{ id: "group", title: "Signals", trackIds: ["a", "b", "c"] }],
  });
}
it("moves membership and order atomically while preserving leaf state", () => {
  const useStore = createStore();
  const notifications: string[][] = [];
  useStore.subscribe((state) => notifications.push(state.order));
  const move = (id: string, destination: { trackSetId?: string; beforeTrackId?: string }) =>
    useStore.getState().moveTrackItem({ kind: "track", id }, destination);
  const original = useStore.getState().getTrack("outside");
  expect(move("outside", { trackSetId: "group", beforeTrackId: "b" })).toEqual({ ok: true });
  expect(useStore.getState().order).toEqual(["pin", "a", "outside", "b", "c", "last"]);
  expect(useStore.getState().trackSets[0].trackIds).toContain("outside");
  expect(notifications).toHaveLength(1);
  expect(move("c", { trackSetId: "group", beforeTrackId: "a" })).toEqual({ ok: true });
  expect(useStore.getState().order).toEqual(["pin", "c", "a", "outside", "b", "last"]);
  expect(move("outside", { beforeTrackId: "last" })).toEqual({ ok: true });
  expect(useStore.getState().order).toEqual(["pin", "c", "a", "b", "outside", "last"]);
  expect(useStore.getState().trackSets[0].trackIds).not.toContain("outside");
  expect(useStore.getState().getTrack("outside")).toEqual(original);
  expect(useStore.getState().hiddenTrackIds).toEqual(["b"]);
  expect(useStore.getState().moveTrackItem({ kind: "set", id: "group" }, {})).toEqual({ ok: true });
  expect(useStore.getState().order).toEqual(["pin", "outside", "last", "c", "a", "b"]);
  useStore
    .getState()
    .createTrackSet({ id: "other", title: "Other", trackIds: ["last"], visible: false });
  expect(move("outside", { trackSetId: "other" })).toEqual({ ok: true });
  expect(useStore.getState().trackSets.find((set) => set.id === "other")).toMatchObject({
    visible: false,
    trackIds: ["last", "outside"],
  });
  expect(move("last", {})).toEqual({ ok: true });
  expect(move("outside", {})).toEqual({ ok: true });
  expect(useStore.getState().trackSets.map((set) => set.id)).toEqual(["group"]);
});
it("rejects invalid destinations, nested groups and pinned moves without partial changes", () => {
  const useStore = createStore();
  const initial = useStore.getState();
  for (const [source, destination] of [
    [{ kind: "track", id: "outside" }, { trackSetId: "missing" }],
    [
      { kind: "track", id: "outside" },
      { trackSetId: "group", beforeTrackId: "last" },
    ],
    [{ kind: "set", id: "group" }, { trackSetId: "group" }],
    [{ kind: "track", id: "pin" }, { trackSetId: "group" }],
    [{ kind: "track", id: "outside" }, { beforeTrackId: "pin" }],
  ] as const) {
    expect(useStore.getState().moveTrackItem(source, destination).ok).toBe(false);
    expect(useStore.getState().order).toEqual(initial.order);
    expect(useStore.getState().trackSets).toEqual(initial.trackSets);
  }
  useStore.getState().setPinnedTrackIds(["pin", "a"]);
  expect(
    useStore.getState().moveTrackItem({ kind: "track", id: "outside" }, { trackSetId: "group" }).ok,
  ).toBe(false);
  expect(useStore.getState().moveTrackItem({ kind: "track", id: "b" }, {}).ok).toBe(false);
});
