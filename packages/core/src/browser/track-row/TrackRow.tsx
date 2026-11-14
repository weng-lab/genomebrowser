import { useRef, useSyncExternalStore, type ErrorInfo } from "react";
import type { AnyTrackInstance } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import { useDataController, useGenomeBrowser } from "../state/browserContextState";
import { getContentPlacement } from "../viewport/renderWindow";
import { ErrorState } from "./content/ErrorState";
import { TrackReorder } from "./reorder/TrackReorder";
import { TrackContent } from "./content/TrackContent";
import { TrackFrame } from "./frame/TrackFrame";
import type { ReorderPreview } from "./reorder/reorderMath";
import type { TrackLayout } from "./layout/trackLayout";
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
  onPreviewChange: (preview: ReorderPreview) => void;
  onPreviewEnd: () => void;
}) {
  const dataController = useDataController();
  const { marginWidth, trackWidth } = useTrackStack();
  const track = useDrawnTrack(layout);
  // Each row subscribes to its own entry, so one track's result renders only its row.
  const getDataState = () => dataController.getTrack(layout.id);
  const dataState = useSyncExternalStore(dataController.subscribe, getDataState, getDataState);

  if (!track) return null;

  // Each track is placed from the region its own data covers.
  const region = dataState.status === "loading" ? visibleRegion : dataState.region;
  const placement = getContentPlacement(region, visibleRegion, trackWidth, marginWidth);

  return (
    <TrackReorder track={track} onPreviewChange={onPreviewChange} onPreviewEnd={onPreviewEnd}>
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
              <ErrorState message={`Track unavailable: ${track.base.title || track.base.id}`} />
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
    </TrackReorder>
  );
}

/**
 * The row's track from the store. Rows don't draw metadata, so after an edit that changes only
 * metadata this keeps the object the row already drew, and the row doesn't render.
 */
function useDrawnTrack(layout: TrackLayout) {
  const { useTrackStore } = useGenomeBrowser();
  const drawn = useRef<AnyTrackInstance | undefined>(undefined);
  return useTrackStore((state) => {
    const track = state.tracks[layout.index];
    if (track?.base.id !== layout.id) return undefined;
    if (drawn.current === undefined || !differsOnlyInMetadata(drawn.current, track)) {
      drawn.current = track;
    }
    return drawn.current;
  });
}

function differsOnlyInMetadata(previous: AnyTrackInstance, next: AnyTrackInstance) {
  const keys = new Set<string>([...Object.keys(previous), ...Object.keys(next)]);
  keys.delete("metadata");
  return [...keys].every(
    (key) => (previous as Record<string, unknown>)[key] === (next as Record<string, unknown>)[key],
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
