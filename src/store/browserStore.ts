import { create } from "zustand";
import { RefObject } from "react";

interface BrowserStore {
  domain: string;
  delta: number;
  svgRef: RefObject<SVGSVGElement | null> | null;
  browserWidth: number;
  trackWidth: number;
  marginWidth: number;
  setDomain: (domain: string) => void;
  setDelta: (delta: number) => void;
  setSvgRef: (ref: RefObject<SVGSVGElement | null>) => void;
}

export const useBrowserStore = create<BrowserStore>((set) => ({
  domain: "",
  delta: 0,
  svgRef: null,
  browserWidth: 1500,
  trackWidth: 1350,
  marginWidth: 150,
  setDomain: (domain: string) => {set({ domain })},
  setDelta: (delta: number) => set({ delta }),
  setSvgRef: (ref: RefObject<SVGSVGElement | null>) => set({ svgRef: ref }),
}));
