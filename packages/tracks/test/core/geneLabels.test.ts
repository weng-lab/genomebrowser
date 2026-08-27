import { describe, expect, it } from "vitest";
import { createGeneLabelLayout } from "../../src/gene/labels";

describe("Gene label placement", () => {
  it("places a label to the right when it fits", () => {
    expect(createGeneLabelLayout("TP53", 10, 40, 100, 10)).toEqual({
      text: "TP53",
      x: 45,
      anchor: "start",
      start: 45,
      end: 69,
    });
  });

  it("places a label to the left when the right side is clipped", () => {
    expect(createGeneLabelLayout("TP53", 40, 90, 100, 10)).toEqual({
      text: "TP53",
      x: 35,
      anchor: "end",
      start: 11,
      end: 35,
    });
  });

  it("hides a label when neither side has room", () => {
    expect(createGeneLabelLayout("A very long gene label", 10, 90, 100, 10)).toBeNull();
  });
});
