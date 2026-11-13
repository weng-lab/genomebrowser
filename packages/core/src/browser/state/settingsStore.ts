import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { SettingsPosition } from "../settings/types";

export type SettingsStore = {
  trackId?: string;
  trackSetId?: string;
  openTrackSetSettings: (trackSetId: string) => void;
  position: SettingsPosition;
  openSettings: (trackId: string, position: SettingsPosition) => void;
  closeSettings: () => void;
};

export type SettingsStoreInstance = UseBoundStore<StoreApi<SettingsStore>>;

export function createSettingsStore(): SettingsStoreInstance {
  return create<SettingsStore>((set) => ({
    trackId: undefined,
    trackSetId: undefined,
    openTrackSetSettings: (trackSetId) => set({ trackSetId, trackId: undefined }),
    position: { x: 0, y: 0 },
    openSettings: (trackId, position) => set({ trackId, position, trackSetId: undefined }),
    closeSettings: () => set({ trackId: undefined, trackSetId: undefined }),
  }));
}
