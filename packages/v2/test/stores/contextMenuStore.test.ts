import { describe, expect, it } from "vitest";
import { createContextMenuStore } from "../../src/stores/contextMenuStore";

describe("createContextMenuStore", () => {
  it("starts closed", () => {
    const store = createContextMenuStore();

    expect(store.getState()).toMatchObject({
      open: false,
      trackId: undefined,
      position: { x: 0, y: 0 },
    });
  });

  it("opens and closes for a track", () => {
    const store = createContextMenuStore();

    store.getState().openContextMenu("signal", { x: 10, y: 20 });

    expect(store.getState()).toMatchObject({
      open: true,
      trackId: "signal",
      position: { x: 10, y: 20 },
    });

    store.getState().closeContextMenu();

    expect(store.getState().open).toBe(false);
  });
});
