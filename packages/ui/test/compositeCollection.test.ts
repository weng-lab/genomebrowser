import { expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createCompositeModule,
  createTrackStore,
  defineTrackModule,
  validateTrackCollection,
} from "@weng-lab/genomebrowser";
import { compileTrackCollections } from "../src/TrackSelect/collection/collectionCompilation";
import { getReconciledTracks } from "../src/TrackSelect/collection/collectionStore";

it("loads composite children with collection-qualified IDs and preserves them on extraction", () => {
  const signal = defineTrackModule({
    type: "signal",
    configSchema: z.object({ value: z.number().default(1) }),
    fetch: async () => null,
    render: { full: () => null },
  });
  const composite = createCompositeModule();
  const store = createTrackStore({ modules: [signal, composite] });
  const collection = validateTrackCollection(
    {
      id: "signals",
      assembly: "test",
      tracks: [
        {
          type: "composite",
          base: { id: "parent", title: "Signals" },
          tracks: [
            { type: "signal", base: { id: "a", title: "A" }, config: {} },
            { type: "signal", base: { id: "b", title: "B" }, config: {} },
          ],
        },
      ],
    },
    [signal, composite],
  );
  const onClick = vi.fn();
  const resolveTrackInteraction = vi.fn<
    (entry: import("../src/TrackSelect/collection/collectionCompilation").CollectionTrackEntry) => {
      onClick: typeof onClick;
    }
  >(() => ({ onClick }));
  const tracks = getReconciledTracks({
    compiledCollections: compileTrackCollections([collection]),
    tracks: [],
    selectedTrackIds: ["signals::parent"],
    registry: store.getState().registry,
    maxTracks: 10,
    resolveTrackInteraction,
  });
  expect(resolveTrackInteraction.mock.calls.map(([entry]) => entry.qualifiedTrackId)).toEqual([
    "signals::a",
    "signals::b",
  ]);
  expect(tracks[0].tracks?.[0].interaction?.onClick).toBeTypeOf("function");
  expect(store.getState().setTracks(tracks)).toEqual({ ok: true });
  expect(store.getState().getTrack("signals::a")?.source).toBe("host");
  expect(store.getState().getTrack("signals::a")?.config).toEqual({ value: 1 });
  const child = store.getState().getTrack("signals::a");
  expect(store.getState().extractTracks("signals::parent", ["signals::a"])).toEqual({ ok: true });
  expect(store.getState().order).toEqual(["signals::parent", "signals::a"]);
  expect(store.getState().getTrack("signals::a")).toBe(child);
});
