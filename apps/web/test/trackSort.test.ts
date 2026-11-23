import type { AnyTrackInstance } from "@weng-lab/genomebrowser";
import { expect, it } from "vitest";
import { getTrackSortOptions } from "../features/browser/trackSort";

const track = (title: string, type: string) =>
  ({ type, base: { title } }) as unknown as AnyTrackInstance;
const labels = (tracks: AnyTrackInstance[]) => getTrackSortOptions(tracks).map((o) => o.label);

it("offers Track type only when the tracks have more than one type", () => {
  expect(labels([])).toEqual(["Title"]);
  expect(labels([track("a", "bigwig"), track("b", "bigwig")])).toEqual(["Title"]);
  expect(labels([track("a", "bigwig"), track("b", "gene")])).toEqual(["Title", "Track type"]);
});
