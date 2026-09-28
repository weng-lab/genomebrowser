import type { ReactElement } from "react";

export type MousePosition = {
  clientX: number;
  clientY: number;
};

export type TooltipAnchor = {
  x: number;
  y: number;
};

export type TooltipEntry = { trackId: string; content: ReactElement };

type TooltipContent = ReactElement | TooltipEntry[];

export type TooltipState = {
  isVisible: boolean;
  content: TooltipContent | undefined;
  anchor: TooltipAnchor;
  owner: string | undefined;
};

export type TooltipStore = TooltipState & {
  show: (owner: string, content: TooltipContent, anchor: TooltipAnchor) => void;
  hide: (owner: string) => void;
};
