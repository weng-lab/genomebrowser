import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createCompositeModule,
  createTrackStore,
  defineTrackModule,
  validateTrackCollection,
} from "../../src/lib";
const ordinary = defineTrackModule({
  type: "signal",
  configSchema: z.object({ value: z.number().default(1) }),
  fetch: async () => null,
  render: { full: () => null },
});
const composite = createCompositeModule();
const track = (id: string) => ordinary.create({ base: { id, title: id }, config: {} });
const setup = () =>
  createTrackStore({ modules: [ordinary, composite], tracks: ["a", "b", "c", "d"].map(track) });

describe("composite store operations", () => {
  it("groups in row order, edits a child in isolation, orders children, extracts and ungroups without renaming", () => {
    const store = setup();
    const original = store.getState().tracks;
    const notify = vi.fn();
    store.subscribe(notify);
    expect(
      store.getState().groupTracks({ id: "group", title: "Group", trackIds: ["c", "a"] }),
    ).toEqual({ ok: true });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(store.getState().order).toEqual(["group", "b", "d"]);
    expect(store.getState().getTrack("group")?.tracks).toEqual([original[0], original[2]]);
    expect(store.getState().getTrack("a")).toBe(original[0]);
    expect(store.getState().updateTrack("a", { base: { color: "#123456" } }).ok).toBe(true);
    expect(store.getState().getTrack("c")).toBe(original[2]);
    const a = store.getState().getTrack("a");
    expect(store.getState().updateTrack("group", { config: { opacity: 0.6 } }).ok).toBe(true);
    expect(store.getState().getTrack("a")).toBe(a);
    expect(store.getState().reorderChildren("group", ["c", "a"]).ok).toBe(true);
    expect(store.getState().extractTracks("group", ["c"]).ok).toBe(true);
    expect(store.getState().order).toEqual(["group", "c", "b", "d"]);
    expect(store.getState().getTrack("c")).toBe(original[2]);
    expect(store.getState().ungroupTrack("group").ok).toBe(true);
    expect(store.getState().order).toEqual(["a", "c", "b", "d"]);
    expect(store.getState().getTrack("a")).toBe(a);
  });

  it("rejects structural failures without changing state or notifying subscribers", () => {
    const store = setup();
    const group = (trackIds: string[], id = "group") =>
      store.getState().groupTracks({ id, title: "Group", trackIds });
    const rejects = (operation: () => unknown) => {
      const before = store.getState();
      const notify = vi.fn();
      const off = store.subscribe(notify);
      expect(operation()).toMatchObject({ ok: false });
      expect(store.getState()).toBe(before);
      expect(notify).not.toHaveBeenCalled();
      off();
    };
    rejects(() => group([]));
    rejects(() => group(["a", "a"]));
    rejects(() => group(["missing"]));
    rejects(() => group(["a"], "d"));
    store.getState().setPinnedTrackIds(["a"]);
    rejects(() => group(["a", "b"]));
    store.getState().setPinnedTrackIds([]);
    group(["a", "b"]);
    rejects(() => group(["group", "c"]));
    rejects(() => group(["a", "c"]));
    rejects(() => store.getState().setPinnedTrackIds(["a"]));
    rejects(() => store.getState().updateTrack("a", { base: { pinned: true } } as never));
    rejects(() => store.getState().extractTracks("group", ["a", "a"]));
    rejects(() => store.getState().extractTracks("group", ["c"]));
    rejects(() => store.getState().reorderChildren("group", ["a"]));
    rejects(() => store.getState().reorderTracks(["group", "c", "d", "a"]));
    rejects(() => store.getState().addTrack(track("a")));
    store.getState().setPinnedTrackIds(["reserved"]);
    rejects(() =>
      store
        .getState()
        .setTracks([
          composite.create({ base: { id: "new", title: "New" }, tracks: [track("reserved")] }),
        ]),
    );
  });

  it("allows pinned composites and source host mutations, and deletes children atomically", () => {
    const store = setup();
    store
      .getState()
      .groupTracks({ id: "group", title: "Group", trackIds: ["a", "b"], source: "host" });
    expect(store.getState().setPinnedTrackIds(["group"]).ok).toBe(true);
    const notify = vi.fn();
    store.subscribe(notify);
    expect(store.getState().removeTrack("a").ok).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(
      store
        .getState()
        .getTrack("group")
        ?.tracks?.map((track) => track.base.id),
    ).toEqual(["b"]);
    expect(store.getState().removeTrack("b").ok).toBe(true);
    expect(store.getState().getTrack("group")).toBeUndefined();
    store.getState().groupTracks({ id: "other", title: "Other", trackIds: ["c", "d"] });
    expect(store.getState().removeTrack("other").ok).toBe(true);
    expect(store.getState().tracks).toEqual([]);
  });

  it("validates child schemas, global IDs, nesting and empty composites at insertion", () => {
    expect(() => composite.create({ base: { id: "empty", title: "Empty" }, tracks: [] })).toThrow();
    const parent = composite.create({
      base: { id: "parent", title: "Parent" },
      tracks: [track("a")],
    });
    expect(() =>
      composite.create({ base: { id: "nested", title: "Nested" }, tracks: [parent] }),
    ).toThrow();
    expect(() =>
      composite.create({ base: { id: "a", title: "Collision" }, tracks: [track("a")] }),
    ).toThrow();
    const store = setup();
    const initial = store.getState();
    for (const child of [
      { ...track("new"), config: { value: "bad" } },
      { ...track("new"), type: "unknown" },
    ]) {
      expect(store.getState().addTrack({ ...parent, tracks: [child] }).ok).toBe(false);
      expect(store.getState()).toBe(initial);
    }
    expect(() =>
      createTrackStore({ modules: [ordinary, composite], tracks: [parent, track("a")] }),
    ).toThrow();
    expect(() =>
      createTrackStore({ modules: [ordinary, composite], tracks: [parent], pinnedTrackIds: ["a"] }),
    ).toThrow();
  });

  it("validates nested collection definitions and IDs across the entire collection", () => {
    const child = { type: "signal", base: { id: "a", title: "A" }, config: {} };
    const input = {
      id: "collection",
      assembly: "test",
      tracks: [{ type: "composite", base: { id: "parent", title: "Parent" }, tracks: [child] }],
    };
    expect(validateTrackCollection(input, [ordinary, composite]).tracks).toEqual(input.tracks);
    expect(() =>
      validateTrackCollection({ ...input, tracks: [...input.tracks, child] }, [
        ordinary,
        composite,
      ]),
    ).toThrow(/duplicates/);
    expect(() =>
      validateTrackCollection(
        {
          ...input,
          tracks: [{ ...input.tracks[0], tracks: [{ ...child, config: { value: "bad" } }] }],
        },
        [ordinary, composite],
      ),
    ).toThrow();
  });
});
