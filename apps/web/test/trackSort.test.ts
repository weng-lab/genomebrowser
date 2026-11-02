import type { AnyTrackInstance } from "@weng-lab/genomebrowser";
import { expect, it } from "vitest";
import { getTrackSortOptions } from "../features/browser/trackSort";

const track = (title: string, type: string) =>
  ({ type, base: { title } }) as unknown as AnyTrackInstance;
const labels = (tracks: AnyTrackInstance[]) => getTrackSortOptions(tracks).map((o) => o.label);
const sorted = (tracks: AnyTrackInstance[], id: string) => {
  const { compare } = getTrackSortOptions(tracks).find((option) => option.id === id)!;
  return tracks.toSorted(compare).map(({ base }) => base.title);
};

it("offers Track type only when the tracks have more than one type", () => {
  expect(labels([])).toEqual(["Title"]);
  expect(labels([track("a", "bigwig"), track("b", "bigwig")])).toEqual(["Title"]);
  expect(labels([track("a", "bigwig"), track("b", "gene")])).toEqual(["Title", "Track type"]);
});

it("compares titles naturally and ignores case", () => {
  const tracks = [track("rep10", "bigwig"), track("Rep2", "bigwig"), track("rep1", "bigwig")];
  expect(sorted(tracks, "title")).toEqual(["rep1", "Rep2", "rep10"]);
});
