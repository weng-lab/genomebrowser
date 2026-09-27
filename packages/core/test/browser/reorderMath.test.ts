// Reorder geometry chooses targets and sibling offsets across unequal track heights.
// Direct cases isolate threshold calculations that are cumbersome to position through DOM gestures.
import { describe, expect, it } from "vitest";
import {
  getReorderedTrackIds,
  getReorderPreview,
  getReorderPreviewOffsetY,
} from "../../src/browser/track-row/reorder/reorderMath";
import {
  createTrackLayouts,
  getTrackWrapperHeight,
} from "../../src/browser/track-row/layout/trackLayout";
import type { TrackInstance } from "../../src/modules/types";

const tracks = [makeTrack("a", 10), makeTrack("b", 10), makeTrack("c", 10)];
const layouts = createTrackLayouts(
  tracks.map((t) => t.base.id),
  tracks.map((t) => getTrackWrapperHeight(t, 0)),
  0,
);

describe("track reorder math", () => {
  it("prevents dragging pinned tracks or previewing a move above them", () => {
    const pins = ["missing", "a"];
    expect(getReorderPreview("a", tracks, 0, 100, pins)).toBeNull();
    expect(getReorderedTrackIds("a", tracks, 0, 100, pins)).toBeNull();
    const preview = getReorderPreview("c", tracks, 0, -100, pins);
    expect(preview).toEqual({ draggedId: "c", currentIndex: 2, targetIndex: 1 });
    expect(getReorderPreviewOffsetY(layouts[0], layouts, preview)).toBe(0);
    expect(getReorderedTrackIds("c", tracks, 0, -100, pins)).toEqual(["a", "c", "b"]);
    expect(getReorderedTrackIds("b", tracks, 0, 100, pins)).toEqual(["a", "c", "b"]);
    expect(getReorderedTrackIds("b", tracks, 0, -100, pins)).toBeNull();
    expect(getReorderPreview("c", tracks, 0, 100, ["a", "b", "c"])).toBeNull();
  });

  it("keeps the preview target on the current track when deltaY is 0", () => {
    expect(getReorderPreview("b", tracks, 0, 0)).toEqual({
      draggedId: "b",
      currentIndex: 1,
      targetIndex: 1,
    });
  });

  it("chooses the closest target index while dragging down", () => {
    expect(getReorderPreview("a", tracks, 0, 9)).toEqual({
      draggedId: "a",
      currentIndex: 0,
      targetIndex: 1,
    });
    expect(getReorderPreview("a", tracks, 0, 18)).toEqual({
      draggedId: "a",
      currentIndex: 0,
      targetIndex: 2,
    });
  });

  it("chooses the closest target index while dragging up", () => {
    expect(getReorderPreview("c", tracks, 0, -9)).toEqual({
      draggedId: "c",
      currentIndex: 2,
      targetIndex: 1,
    });
    expect(getReorderPreview("c", tracks, 0, -18)).toEqual({
      draggedId: "c",
      currentIndex: 2,
      targetIndex: 0,
    });
  });

  it("offsets non-dragged tracks for the active preview", () => {
    const draggingDown = { draggedId: "a", currentIndex: 0, targetIndex: 2 };
    expect(getReorderPreviewOffsetY(layouts[0], layouts, draggingDown)).toBe(0);
    expect(getReorderPreviewOffsetY(layouts[1], layouts, draggingDown)).toBe(-10);
    expect(getReorderPreviewOffsetY(layouts[2], layouts, draggingDown)).toBe(-10);

    const draggingUp = { draggedId: "c", currentIndex: 2, targetIndex: 0 };
    expect(getReorderPreviewOffsetY(layouts[0], layouts, draggingUp)).toBe(10);
    expect(getReorderPreviewOffsetY(layouts[1], layouts, draggingUp)).toBe(10);
    expect(getReorderPreviewOffsetY(layouts[2], layouts, draggingUp)).toBe(0);
  });

  it("displaces siblings by the dragged frame's full height", () => {
    const uneven = [makeTrack("a", 10), makeTrack("b", 30), makeTrack("c", 20)];
    uneven[1].base.title = "Title";
    const layout = createTrackLayouts(
      uneven.map((track) => track.base.id),
      uneven.map((track) => getTrackWrapperHeight(track, 10)),
      0,
    );
    const preview = { draggedId: "b", currentIndex: 1, targetIndex: 2 };
    expect(getReorderPreviewOffsetY(layout[0], layout, preview)).toBe(0);
    expect(getReorderPreviewOffsetY(layout[1], layout, preview)).toBe(0);
    expect(getReorderPreviewOffsetY(layout[2], layout, preview)).toBe(-45);
  });

  it("returns the next order while moving only the dragged track id", () => {
    expect(getReorderedTrackIds("a", tracks, 0, 18)).toEqual(["b", "c", "a"]);
    expect(getReorderedTrackIds("b", tracks, 0, 0)).toBeNull();
    expect(getReorderedTrackIds("missing", tracks, 0, 18)).toBeNull();
  });
});

function makeTrack(id: string, height: number): TrackInstance<{}> {
  return {
    type: "test",
    base: {
      id,
      title: "",
      display: "dense",
      height,
      color: "#000000",
    },
    config: {},
    source: "user",
  };
}
