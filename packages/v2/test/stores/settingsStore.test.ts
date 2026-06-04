import { describe, expect, it } from "vitest";
import {
  type BaseSettingsProps,
  createSettingsStore,
  type SettingsModalProps,
} from "../../src/stores/settingsStore";

describe("createSettingsStore", () => {
  function ModalComponent(_props: SettingsModalProps) {
    return null;
  }

  function BaseSettingsComponent(_props: BaseSettingsProps) {
    return null;
  }

  function ReplacementModal(_props: SettingsModalProps) {
    return null;
  }

  function ReplacementBaseSettings(_props: BaseSettingsProps) {
    return null;
  }

  it("starts closed with defaults", () => {
    const store = createSettingsStore();

    expect(store.getState().open).toBe(false);
    expect(store.getState().trackId).toBeUndefined();
  });

  it("opens and closes settings for a track", () => {
    const store = createSettingsStore();

    store.getState().openSettings("signal", { x: 10, y: 20 });

    expect(store.getState()).toMatchObject({
      open: true,
      trackId: "signal",
      position: { x: 10, y: 20 },
    });

    store.getState().closeSettings();

    expect(store.getState().open).toBe(false);
  });

  it("uses component overrides from input", () => {
    const store = createSettingsStore({
      modalComponent: ModalComponent,
      baseSettingsComponent: BaseSettingsComponent,
    });

    expect(store.getState().modalComponent).toBe(ModalComponent);
    expect(store.getState().baseSettingsComponent).toBe(BaseSettingsComponent);
  });

  it("replaces modal and base settings components", () => {
    const store = createSettingsStore({
      modalComponent: ModalComponent,
      baseSettingsComponent: BaseSettingsComponent,
    });

    store.getState().setModalComponent(ReplacementModal);
    store.getState().setBaseSettingsComponent(ReplacementBaseSettings);

    expect(store.getState().modalComponent).toBe(ReplacementModal);
    expect(store.getState().baseSettingsComponent).toBe(ReplacementBaseSettings);
  });
});
