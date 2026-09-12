import { createContext } from "react";

export const trackOverlayContext = createContext<{
  target: SVGGElement | null;
  width: number;
  height: number;
} | null>(null);
