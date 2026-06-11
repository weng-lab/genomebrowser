import { useCallback, useState } from "react";
import type { DataState } from "../../data/types";
import type { createModuleRegistry } from "../../modules/registry";
import type { TrackConfigBase } from "../../modules/types";
import type { BrowserRegion } from "../../utils/region";
import { SwapTrack } from "../swap/SwapTrack";
import { getSwapPreviewOffsetY, isSameSwapPreview } from "../swap/trackSwapMath";
import type { SwapPreview } from "../swap/types";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { TrackContent } from "./TrackContent";
import { TrackFrame } from "./TrackFrame";
import { getTrackTitleMargin, getTrackWrapperHeight } from "./trackLayout";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function TrackStack({
  tracks,
  dataStates,
  registry,
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
  tracks: TrackConfigBase[];
  dataStates: Record<string, DataState>;
  registry: ModuleRegistry;
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
    const previewOffsetY = getSwapPreviewOffsetY(index, track.id, tracks, titleSize, swapPreview);
    y += wrapperHeight;

    return (
      <SwapTrack
        key={track.id}
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
            registerContentGroup={registerContentGroup}
            panDrag={panDrag}
            isPanLocked={isPanLocked}
            disableHover={!!swapPreview}
            titleSize={titleSize}
          >
            <TrackContent
              track={track}
              dataState={dataStates[track.id]}
              registry={registry}
              region={region}
              width={contentWidth ?? trackWidth}
              height={track.height}
              titleMargin={titleMargin}
              panDrag={panDrag}
            />
          </TrackFrame>
        )}
      </SwapTrack>
    );
  });
}
