import { create } from "zustand";

interface BrowserStore {
  domain: string;
  setDomain: (domain: string) => void;
}

export const useBrowserStore = create<BrowserStore>((set) => ({
  domain: "",
  setDomain: (domain: string) => set({ domain }),
}));
