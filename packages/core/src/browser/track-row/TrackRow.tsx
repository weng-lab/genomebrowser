import type { ErrorInfo } from "react";
import type { DataState } from "../data/types";
import type { AnyTrackInstance } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
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
  isPanLocked,
  disableHover,
  titleSize,
  onPreviewChange,
  onPreviewEnd,
}: {
  track: AnyTrackInstance;
  dataState: DataState | undefined;
  visibleRegion: GenomicRegion;
  region: GenomicRegion;
  y: number;
  previewOffsetY: number;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  contentWidth?: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
  panDrag?: PanDragHandlers;
  isPanLocked?: boolean;
  disableHover: boolean;
  titleSize: number;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
}) {
  return (
    <SwapTrack
      track={track}
      titleSize={titleSize}
      disabled={isPanLocked}
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
          registerContentGroup={registerContentGroup}
          panDrag={panDrag}
          isPanLocked={isPanLocked}
          disableHover={disableHover}
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
              dataState={dataState ?? { status: "loading" }}
              visibleRegion={visibleRegion}
              region={region}
              width={contentWidth ?? trackWidth}
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
