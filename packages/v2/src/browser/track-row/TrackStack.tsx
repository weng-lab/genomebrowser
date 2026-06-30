import { useCallback, useState } from "react";
import type { DataState } from "../data/types";
import type { TrackInstance } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
import { SwapTrack } from "./SwapTrack";
import { getSwapPreviewOffsetY, isSameSwapPreview } from "./trackSwapMath";
import type { SwapPreview } from "./swapTypes";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { TrackContent } from "./TrackContent";
import { TrackFrame } from "./TrackFrame";
import { getTrackTitleMargin, getTrackWrapperHeight } from "./trackLayout";

export function TrackStack({
  tracks,
  dataStates,
  region,
  marginWidth,
  trackWidth,
  contentX,
  contentWidth,
  registerContentGroup,
  panDrag,
  isPanLocked,
  titleSize,
  startY,
}: {
  tracks: TrackInstance<any, any>[];
  dataStates: Record<string, DataState>;
  region: BrowserRegion;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  contentWidth?: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
  panDrag?: PanDragHandlers;
  isPanLocked?: boolean;
  titleSize: number;
  startY: number;
}) {
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  const handlePreviewChange = useCallback((preview: SwapPreview) => {
    setSwapPreview((current) => (isSameSwapPreview(current, preview) ? current : preview));
  }, []);
  const handlePreviewEnd = useCallback(() => {
    setSwapPreview(null);
  }, []);
  let y = startY;

  return tracks.map((track, index) => {
    const trackY = y;
    const wrapperHeight = getTrackWrapperHeight(track, titleSize);
    const titleMargin = getTrackTitleMargin(track, titleSize);
    const previewOffsetY = getSwapPreviewOffsetY(
      index,
      track.base.id,
      tracks,
      titleSize,
      swapPreview,
    );
    y += wrapperHeight;

    return (
      <SwapTrack
        key={track.base.id}
        track={track}
        titleSize={titleSize}
        disabled={isPanLocked}
        onPreviewChange={handlePreviewChange}
        onPreviewEnd={handlePreviewEnd}
      >
        {(swapProps) => (
          <TrackFrame
            {...swapProps}
            track={track}
            y={trackY}
            previewOffsetY={previewOffsetY}
            marginWidth={marginWidth}
            trackWidth={trackWidth}
            contentX={contentX}
            contentWidth={contentWidth}
            registerContentGroup={registerContentGroup}
            panDrag={panDrag}
            isPanLocked={isPanLocked}
            disableHover={!!swapPreview}
            titleSize={titleSize}
          >
            <TrackContent
              track={track}
              dataState={dataStates[track.base.id]}
              region={region}
              width={contentWidth ?? trackWidth}
              height={track.base.height}
              titleMargin={titleMargin}
            />
          </TrackFrame>
        )}
      </SwapTrack>
    );
  });
}
