import type { AnyTrackInstance, TrackMetadata } from "@weng-lab/genomebrowser";
import { expect, it } from "vitest";
import { getTrackSortOptions } from "../features/browser/trackSort";

const track = (id: string, type: string, metadata?: TrackMetadata) =>
  ({ type, base: { id, title: id }, metadata }) as unknown as AnyTrackInstance;
const labels = (tracks: AnyTrackInstance[], pinnedTrackIds: string[] = []) =>
  getTrackSortOptions({ tracks, pinnedTrackIds }).map((option) => option.label);

it("offers Track type only when the unpinned tracks have more than one type", () => {
  expect(labels([])).toEqual(["Title"]);
  expect(labels([track("a", "bigwig"), track("b", "bigwig")])).toEqual(["Title"]);
  expect(labels([track("a", "bigwig"), track("b", "gene")])).toEqual(["Title", "Track type"]);
  const ruler = track("ruler", "ruler");
  expect(labels([ruler, track("a", "bigwig"), track("b", "bigwig")], ["ruler"])).toEqual(["Title"]);
});

it.each([
  ["one tagged track, since no value counts as one", [{ v: true }, undefined], ["v"]],
  ["one value on every track", [{ v: "ATAC" }, { v: "ATAC" }], []],
  ["null alongside no value", [{ v: null }, undefined], []],
  ["a number and the same text", [{ v: 1 }, { v: "1" }], ["v"]],
])("offers a metadata field by its unpinned values: %s", (_, records, offered) => {
  const tracks = records.map((metadata, index) => track(`t${index}`, "bigwig", metadata));
  expect(labels(tracks)).toEqual(["Title", ...offered]);
});

it("leaves out a metadata field whose only different value is on a pinned track", () => {
  const tracks = [
    track("pinned", "bigwig", { Assay: "RNA" }),
    track("a", "bigwig", { Assay: "ATAC" }),
    track("b", "bigwig", { Assay: "ATAC" }),
  ];
  expect(labels(tracks, ["pinned"])).toEqual(["Title"]);
});

it("lists metadata fields after Title and Track type, named as typed, in natural order", () => {
  const metadata = { "rep 10": 1, biosample_term_name: "K562", "rep 2": 1, Assay: "ATAC" };
  const tracks = [track("a", "bigwig", metadata), track("b", "gene")];
  expect(labels(tracks)).toEqual([
    "Title",
    "Track type",
    "Assay",
    "biosample_term_name",
    "rep 2",
    "rep 10",
  ]);
});
