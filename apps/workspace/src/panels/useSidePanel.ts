import { useState } from "react";
import type { Side } from "../types";

/** Width limits for each side panel. */
export const sidePanelSizes = {
  left: { defaultWidth: 240, minWidth: 180, maxWidth: 480 },
  right: { defaultWidth: 360, minWidth: 280, maxWidth: 720 },
} satisfies Record<Side, { defaultWidth: number; minWidth: number; maxWidth: number }>;

export type SidePanelState = {
  open: boolean;
  /** Collapses or reopens the panel, animating the change. */
  toggle: () => void;
  /**
   * True from a toggle until its animation ends. Only toggles animate: a page change that
   * opens or closes the panel swaps it instantly.
   */
  animating: boolean;
  endAnimation: () => void;
  width: number;
  setWidth: (width: number) => void;
};

/** Visibility and width for one side of the frame. They outlive pages, so they carry across them. */
export function useSidePanel(side: Side): SidePanelState {
  const [open, setOpen] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [width, setWidth] = useState(sidePanelSizes[side].defaultWidth);
  return {
    open,
    toggle: () => {
      setAnimating(true);
      setOpen((value) => !value);
    },
    animating,
    endAnimation: () => setAnimating(false),
    width,
    setWidth,
  };
}
