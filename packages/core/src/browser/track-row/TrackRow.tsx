import { useSyncExternalStore, type ErrorInfo } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import { useDataController, useGenomeBrowser } from "../state/browserContextState";
import { getContentPlacement } from "../viewport/renderWindow";
import { ErrorState } from "./ErrorState";
import { SwapTrack } from "./SwapTrack";
import { TrackContent } from "./TrackContent";
import { TrackFrame } from "./TrackFrame";
import type { SwapPreview } from "./swapTypes";
import type { TrackLayout } from "./trackLayout";
import { useTrackStack } from "./trackStackContext";

const trackRenderErrorPrefix = "[genomebrowser] Track render error";

export function TrackRow({
  layout,
  visibleRegion,
  previewOffsetY,
  disableHover,
  onPreviewChange,
  onPreviewEnd,
}: {
  layout: TrackLayout;
  visibleRegion: GenomicRegion;
  previewOffsetY: number;
  disableHover: boolean;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
}) {
  const { useTrackStore } = useGenomeBrowser();
  const dataController = useDataController();
  const { marginWidth, trackWidth } = useTrackStack();
  const track = useTrackStore((state) =>
    state.tracks[layout.index]?.base.id === layout.id ? state.tracks[layout.index] : undefined,
  );
  // Each row subscribes to its own entry, so one track's result renders only its row.
  const getDataState = () => dataController.getTrack(layout.id);
  const dataState = useSyncExternalStore(dataController.subscribe, getDataState, getDataState);

  if (!track) return null;

  // Each track is placed from the region its own data covers.
  const region = dataState.status === "loading" ? visibleRegion : dataState.region;
  const placement = getContentPlacement(region, visibleRegion, trackWidth, marginWidth);

  return (
    <SwapTrack track={track} onPreviewChange={onPreviewChange} onPreviewEnd={onPreviewEnd}>
      {(swapProps) => (
        <TrackFrame
          {...swapProps}
          track={track}
          y={layout.y}
          previewOffsetY={previewOffsetY}
          contentX={placement.x}
          contentWidth={placement.width}
          limitsDrag={dataState.status !== "loading"}
          disableHover={disableHover}
        >
          <RenderErrorBoundary
            fallback={
              <ErrorState
                x={0}
                y={0}
                width={placement.width}
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
              width={placement.width}
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
