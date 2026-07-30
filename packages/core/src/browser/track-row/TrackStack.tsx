import { useCallback, useState, type ErrorInfo } from "react";
import type { DataState } from "../data/types";
import type { AnyTrackInstance } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import { SwapTrack } from "./SwapTrack";
import { getSwapPreviewOffsetY, isSameSwapPreview } from "./trackSwapMath";
import type { SwapPreview } from "./swapTypes";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { TrackContent } from "./TrackContent";
import { TrackFrame } from "./TrackFrame";
import { ErrorState } from "./ErrorState";
import { getTrackWrapperHeight } from "./trackLayout";

const trackRenderErrorPrefix = "[genomebrowser] Track render error";

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
  tracks: AnyTrackInstance[];
  dataStates: Record<string, DataState>;
  region: GenomicRegion;
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
            <RenderErrorBoundary
              fallback={
                <ErrorState
                  x={0}
                  y={0}
                  width={contentWidth ?? trackWidth}
                  height={track.base.height}
                  message={`Track unavailable: ${track.base.title || track.base.id}`}
                />
              }
              onError={(error, info) => reportTrackRenderError(track, error, info)}
            >
              <TrackContent
                track={track}
                dataState={dataStates[track.base.id]}
                region={region}
                width={contentWidth ?? trackWidth}
                height={track.base.height}
              />
            </RenderErrorBoundary>
          </TrackFrame>
        )}
      </SwapTrack>
    );
  });
}

function reportTrackRenderError(track: AnyTrackInstance, error: unknown, info: ErrorInfo) {
  console.error(trackRenderErrorPrefix, {
    track: {
      id: track.base.id,
      type: track.type,
      display: track.base.display,
      ...(track.base.title ? { title: track.base.title } : {}),
    },
    error,
    ...(info.componentStack ? { componentStack: info.componentStack } : {}),
  });
}
