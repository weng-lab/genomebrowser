import { createContext, type ReactElement } from "react";
import type { MousePosition } from "./types";

export type TooltipTarget = {
  trackId: string;
  content: (position: MousePosition, hit: Element) => ReactElement | undefined;
};

export const CompositeTooltipContext = createContext<{
  enabled: boolean;
  register: (element: Element, target: TooltipTarget) => () => void;
} | null>(null);
