import { describe, expect, it } from "vitest";
import { createSettingsStore } from "../../src/browser/state/settingsStore";

describe("internal settings state", () => {
  it("opens, switches, and clears the selected track on close", () => {
    const useStore = createSettingsStore();
    expect(useStore.getState().trackId).toBeUndefined();
    useStore.getState().openSettings("first", { x: 10, y: 20 });
    expect(useStore.getState()).toMatchObject({ trackId: "first", position: { x: 10, y: 20 } });
    useStore.getState().openSettings("second", { x: 30, y: 40 });
    expect(useStore.getState()).toMatchObject({ trackId: "second", position: { x: 30, y: 40 } });
    useStore.getState().closeSettings();
    expect(useStore.getState().trackId).toBeUndefined();
  });
});
