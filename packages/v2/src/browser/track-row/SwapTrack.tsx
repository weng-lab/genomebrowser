import { useRef } from "react";
import { createPortal } from "react-dom";
import type { TrackInstance } from "../../modules/types";
import { useTrackSwap } from "./useTrackSwap";
import type { SwapPreview, SwapTrackRender } from "./swapTypes";

export function SwapTrack({
  track,
  titleSize,
  disabled = false,
  onPreviewChange,
  onPreviewEnd,
  children,
}: {
  track: TrackInstance<any, any>;
  titleSize: number;
  disabled?: boolean;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
  children: SwapTrackRender;
}) {
  const cloneRef = useRef<SVGGElement>(null);
  const { svg, isSwapping, swapProps, cloneSwapProps } = useTrackSwap({
    track,
    titleSize,
    disabled,
    onPreviewChange,
    onPreviewEnd,
    cloneRef,
  });

  return (
    <>
      <g opacity={isSwapping ? 0 : 1} pointerEvents={isSwapping ? "none" : undefined}>
        {children(swapProps)}
      </g>
      {isSwapping &&
        svg &&
        createPortal(
          <g
            ref={cloneRef}
            transform="translate(0,0)"
            style={{
              cursor: "grabbing",
              filter: "drop-shadow(2px 2px 2px gray)",
              pointerEvents: "none",
            }}
          >
            {children(cloneSwapProps)}
          </g>,
          svg,
        )}
    </>
  );
}
