import type { PointerEvent, ReactNode } from "react";

export type SwapPreview = {
  draggedId: string;
  currentIndex: number;
  targetIndex: number;
};

export type TrackFrameSwapProps = {
  onSwapPointerDown?: (event: PointerEvent<SVGRectElement>) => void;
  swapping: boolean;
  isDragClone: boolean;
};

export type SwapTrackRender = (props: TrackFrameSwapProps) => ReactNode;
