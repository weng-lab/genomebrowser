import { describe, expect, it } from "vitest";
import { compileTrackCollections } from "../src/TrackSelect/collection/collectionCompilation";
import type { TrackCollection } from "../src/collections/collectionSchema";

const collection: TrackCollection = {
  assembly: "hg38",
  id: "catalog",
  label: "Catalog",
  views: [
    {
      id: "default",
      label: "Default",
      columns: [{ field: "assay" }],
      grouping: [],
      leaf: "title",
    },
  ],
  tracks: [
    {
      base: {
        id: "one",
        title: "Track one",
      },
      type: "signal",
      config: { url: "one" },
      metadata: { assay: "RNA", id: "metadata-id" },
    },
  ],
};

describe("TrackSelect collection compilation", () => {
  it("prebuilds collection records and global identity indexes", () => {
    const compiled = compileTrackCollections([collection]);
    const record = compiled.records[0]!;

    expect(record.rows).toEqual([
      {
        assay: "RNA",
        id: "catalog::one",
        title: "Track one",
        type: "signal",
        track: collection.tracks[0],
      },
    ]);
    expect(record.trackIds).toEqual(new Set(["catalog::one"]));
    expect(compiled.recordsById.get("catalog")).toBe(record);
    expect(compiled.tracksById.get("catalog::one")).toEqual({
      collectionId: "catalog",
      qualifiedTrackId: "catalog::one",
      track: collection.tracks[0],
    });
    expect(compiled.key).toBe('["catalog",["default"],["one"]]');
  });

  it("rejects duplicate collection and qualified track IDs while compiling", () => {
    expect(() => compileTrackCollections([collection, { ...collection }])).toThrow(
      "Duplicate track collection id: catalog",
    );
    expect(() =>
      compileTrackCollections([
        { ...collection, tracks: [collection.tracks[0]!, { ...collection.tracks[0]! }] },
      ]),
    ).toThrow("Duplicate collection track id: catalog::one");
  });

  it("creates distinct keys when IDs contain key delimiters", () => {
    const combinedId = compileTrackCollections([
      {
        ...collection,
        tracks: [
          { ...collection.tracks[0]!, base: { ...collection.tracks[0]!.base, id: "one,two" } },
        ],
      },
    ]);
    const separateIds = compileTrackCollections([
      {
        ...collection,
        tracks: [
          collection.tracks[0]!,
          { ...collection.tracks[0]!, base: { ...collection.tracks[0]!.base, id: "two" } },
        ],
      },
    ]);

    expect(combinedId.key).not.toBe(separateIds.key);
  });
});
