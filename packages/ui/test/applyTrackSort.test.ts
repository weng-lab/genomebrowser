import { createTrackStore, defineTrackModule, type TrackMetadata } from "@weng-lab/genomebrowser";
import { expect, it } from "vitest";
import { z } from "zod";
import {
  applyTrackSort,
  type TrackSortDirection,
  type TrackSortOption,
  type TrackSortValue,
} from "../src/lib";

const signalModule = defineTrackModule({
  type: "signal",
  configSchema: z.object({ url: z.string().min(1) }),
  fetch: async () => null,
  render: { full: () => null },
});

const field = (key: string): TrackSortOption => ({
  id: key,
  label: key,
  value: (track) => track.metadata?.[key],
});

/** Sorts tracks holding these metadata records and returns the records in their new order. */
function sortRecords(
  records: readonly TrackMetadata[],
  rules: readonly [key: string, direction: TrackSortDirection][],
) {
  const tracks = records.map((metadata, index) =>
    signalModule.create({
      base: { id: `track-${index}`, title: `Track ${index}` },
      config: { url: "YOUR_URL_HERE" },
      metadata,
    }),
  );
  const trackStore = createTrackStore({ modules: [signalModule], tracks });
  const result = applyTrackSort(
    trackStore,
    rules.map(([key, direction]) => ({ option: field(key), direction })),
  );
  expect(result).toEqual({ ok: true });
  return trackStore.getState().tracks.map(({ metadata }) => metadata);
}

/** Sorts tracks by one value each; `undefined` leaves a track without the field. */
function sortValues(values: readonly TrackSortValue[], direction: TrackSortDirection) {
  const records = values.map((value) => (value === undefined ? {} : { v: value }));
  return sortRecords(records, [["v", direction]]).map((metadata) => metadata?.v);
}

it.each([
  ["numbers numerically", [10, -2, 1.25, -10, 1.5, 9], [-10, -2, 1.25, 1.5, 9, 10]],
  ["text naturally, ignoring case", ["rep10", "Rep2", "rep1"], ["rep1", "Rep2", "rep10"]],
  ["false before true", [true, false], [false, true]],
  [
    "mixed types as numbers, then text, then true/false",
    ["b", 2, true, "a", 1],
    [1, 2, "a", "b", true],
  ],
])("orders %s", (_, values, expected) => {
  expect(sortValues(values, "ascending")).toEqual(expected);
  expect(sortValues(values, "descending")).toEqual(expected.toReversed());
});

it("puts tracks without a value last in either direction, in their current order", () => {
  const values = [undefined, 2, null, 1, 3];
  expect(sortValues(values, "ascending")).toEqual([1, 2, 3, undefined, null]);
  expect(sortValues(values, "descending")).toEqual([3, 2, 1, undefined, null]);
});

it("breaks ties with each later rule in its own direction", () => {
  const records = [
    { group: "x", rank: 1 },
    { group: "y", rank: 2 },
    { group: "x", rank: 3 },
    { group: "y", rank: 1 },
  ];
  expect(
    sortRecords(records, [
      ["group", "ascending"],
      ["rank", "descending"],
    ]),
  ).toEqual([
    { group: "x", rank: 3 },
    { group: "x", rank: 1 },
    { group: "y", rank: 2 },
    { group: "y", rank: 1 },
  ]);
});
