import { describe, expect, it } from "vitest";
import {
  getSwapOrder,
  getSwapPreview,
  getSwapPreviewOffsetY,
} from "../../src/browser/swap/trackSwapMath";
import type { TrackConfigBase } from "../../src/modules/types";

const tracks = [makeTrack("a", 10), makeTrack("b", 10), makeTrack("c", 10)];

describe("track swap math", () => {
  it("keeps the preview target on the current track when deltaY is 0", () => {
    expect(getSwapPreview("b", tracks, 0, 0)).toEqual({
      draggedId: "b",
      currentIndex: 1,
      targetIndex: 1,
    });
  });

  it("chooses the closest target index while dragging down", () => {
    expect(getSwapPreview("a", tracks, 0, 9)).toEqual({
      draggedId: "a",
      currentIndex: 0,
      targetIndex: 1,
    });
    expect(getSwapPreview("a", tracks, 0, 18)).toEqual({
      draggedId: "a",
      currentIndex: 0,
      targetIndex: 2,
    });
  });

  it("chooses the closest target index while dragging up", () => {
    expect(getSwapPreview("c", tracks, 0, -9)).toEqual({
      draggedId: "c",
      currentIndex: 2,
      targetIndex: 1,
    });
    expect(getSwapPreview("c", tracks, 0, -18)).toEqual({
      draggedId: "c",
      currentIndex: 2,
      targetIndex: 0,
    });
  });

  it("offsets non-dragged tracks for the active preview", () => {
    const draggingDown = { draggedId: "a", currentIndex: 0, targetIndex: 2 };
    expect(getSwapPreviewOffsetY(0, "a", tracks, 0, draggingDown)).toBe(0);
    expect(getSwapPreviewOffsetY(1, "b", tracks, 0, draggingDown)).toBe(-10);
    expect(getSwapPreviewOffsetY(2, "c", tracks, 0, draggingDown)).toBe(-10);

    const draggingUp = { draggedId: "c", currentIndex: 2, targetIndex: 0 };
    expect(getSwapPreviewOffsetY(0, "a", tracks, 0, draggingUp)).toBe(10);
    expect(getSwapPreviewOffsetY(1, "b", tracks, 0, draggingUp)).toBe(10);
    expect(getSwapPreviewOffsetY(2, "c", tracks, 0, draggingUp)).toBe(0);
  });

  it("returns the next order while moving only the dragged track id", () => {
    expect(getSwapOrder("a", tracks, 0, 18)).toEqual(["b", "c", "a"]);
    expect(getSwapOrder("b", tracks, 0, 0)).toBeNull();
    expect(getSwapOrder("missing", tracks, 0, 18)).toBeNull();
  });
});

function makeTrack(id: string, height: number): TrackConfigBase {
  return {
    id,
    type: "test",
    title: "",
    display: "dense",
    height,
  };
}
