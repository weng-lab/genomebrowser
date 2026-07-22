import { create } from "zustand";
import type { TooltipStore } from "./types";

export type TooltipStoreInstance = ReturnType<typeof createTooltipStore>;

export function createTooltipStore() {
  return create<TooltipStore>((set) => ({
    isVisible: false,
    content: undefined,
    anchor: { x: 0, y: 0 },
    owner: undefined,
    show: (owner, content, anchor) => set({ isVisible: true, content, anchor, owner }),
    hide: (owner) =>
      set((state) =>
        state.owner === owner
          ? {
              isVisible: false,
              content: undefined,
              anchor: { x: 0, y: 0 },
              owner: undefined,
            }
          : state,
      ),
  }));
}
