import type { ComponentType } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { DefaultBaseSettings } from "./DefaultBaseSettings";
import { DefaultSettingsModal } from "./DefaultSettingsModal";
import type {
  BaseSettingsProps,
  SettingsModalProps,
  SettingsPosition,
  SettingsStoreInput,
} from "./types";

export type SettingsStore = {
  open: boolean;
  trackId?: string;
  position: SettingsPosition;
  modalComponent: ComponentType<SettingsModalProps>;
  baseSettingsComponent: ComponentType<BaseSettingsProps>;
  openSettings: (trackId: string, position: SettingsPosition) => void;
  closeSettings: () => void;
  setModalComponent: (component: ComponentType<SettingsModalProps>) => void;
  setBaseSettingsComponent: (component: ComponentType<BaseSettingsProps>) => void;
};

export type SettingsStoreInstance = UseBoundStore<StoreApi<SettingsStore>>;

export function createSettingsStore(input: SettingsStoreInput = {}): SettingsStoreInstance {
  return create<SettingsStore>((set) => ({
    open: false,
    trackId: undefined,
    position: { x: 0, y: 0 },
    modalComponent: input.modalComponent ?? DefaultSettingsModal,
    baseSettingsComponent: input.baseSettingsComponent ?? DefaultBaseSettings,
    openSettings: (trackId, position) => set({ open: true, trackId, position }),
    closeSettings: () => set({ open: false }),
    setModalComponent: (component) => set({ modalComponent: component }),
    setBaseSettingsComponent: (component) => set({ baseSettingsComponent: component }),
  }));
}

export type {
  BaseSettingsProps,
  SettingsModalProps,
  SettingsPosition,
  SettingsStoreInput,
} from "./types";
