import type { ErrorInfo } from "react";
import type { TrackDataState } from "../data/trackDataController";
import type { AnyTrackInstance } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import type { RegisterContentGroup } from "../viewport/useContentTransform";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { ErrorState } from "./ErrorState";
import { SwapTrack } from "./SwapTrack";
import { TrackContent } from "./TrackContent";
import { TrackFrame } from "./TrackFrame";
import type { SwapPreview } from "./swapTypes";

const trackRenderErrorPrefix = "[genomebrowser] Track render error";

export function TrackRow({
  track,
  dataState,
  visibleRegion,
  region,
  y,
  previewOffsetY,
  marginWidth,
  trackWidth,
  contentX,
  contentWidth,
  registerContentGroup,
  panDrag,
  disableHover,
  titleSize,
  onPreviewChange,
  onPreviewEnd,
}: {
  track: AnyTrackInstance;
  dataState: TrackDataState;
  visibleRegion: GenomicRegion;
  region: GenomicRegion;
  y: number;
  previewOffsetY: number;
  marginWidth: number;
  trackWidth: number;
  contentX: number;
  contentWidth: number;
  registerContentGroup?: RegisterContentGroup;
  panDrag?: PanDragHandlers;
  disableHover: boolean;
  titleSize: number;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
}) {
  return (
    <SwapTrack
      track={track}
      titleSize={titleSize}
      onPreviewChange={onPreviewChange}
      onPreviewEnd={onPreviewEnd}
    >
      {(swapProps) => (
        <TrackFrame
          {...swapProps}
          track={track}
          y={y}
          previewOffsetY={previewOffsetY}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          contentX={contentX}
          contentWidth={contentWidth}
          limitsDrag={dataState.status !== "loading"}
          registerContentGroup={registerContentGroup}
          panDrag={panDrag}
          disableHover={disableHover}
          titleSize={titleSize}
        >
          <RenderErrorBoundary
            fallback={
              <ErrorState
                x={0}
                y={0}
                width={contentWidth}
                height={track.base.height}
                message={`Track unavailable: ${track.base.title || track.base.id}`}
              />
            }
            onError={(error, info) => reportTrackRenderError(track, error, info)}
          >
            <TrackContent
              track={track}
              dataState={dataState}
              visibleRegion={visibleRegion}
              region={region}
              width={contentWidth}
              height={track.base.height}
            />
          </RenderErrorBoundary>
        </TrackFrame>
      )}
    </SwapTrack>
  );
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
