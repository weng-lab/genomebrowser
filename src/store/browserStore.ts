import { create } from "zustand";
import { RefObject } from "react";
import { Domain } from "../utils/types";

interface IntitialBrowserState {
  domain: Domain;
  marginWidth: number;
  trackWidth: number;
}

interface BrowserState {
  domain: Domain;
  delta: number;
  svgRef: RefObject<SVGSVGElement | null> | null;
  browserWidth: number;
  trackWidth: number;
  marginWidth: number;
}

interface BrowserStore extends BrowserState {
  setDomain: (domain: Domain) => void;
  setDelta: (delta: number) => void;
  setSvgRef: (ref: RefObject<SVGSVGElement | null>) => void;
  initialize: (state: IntitialBrowserState) => void;
}

// TODO: set a better default state
export const useBrowserStore = create<BrowserStore>((set) => ({
  domain: { chromosome: "chr1", start: 0, end: 1350 },
  delta: 0,
  svgRef: null,
  browserWidth: 1500,
  trackWidth: 1350,
  marginWidth: 150,
  initialize: (state: IntitialBrowserState) => {
    set({
      domain: state.domain,
      browserWidth: state.trackWidth + state.marginWidth,
      trackWidth: state.trackWidth,
      marginWidth: state.marginWidth,
    });
  },
  setDomain: (domain: Domain) => {
    set({ domain });
  },
  setDelta: (delta: number) => set({ delta }),
  setSvgRef: (ref: RefObject<SVGSVGElement | null>) => set({ svgRef: ref }),
}));
