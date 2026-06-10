import { useCallback, useState, type ComponentType } from "react";
import type { DataState } from "../data/types";
import type { BrowserRegion } from "../utils/region";
import type { createModuleRegistry } from "../modules/registry";
import type { TrackConfigBase, TrackRendererProps } from "../modules/types";
import type { TrackStoreInstance } from "../stores/trackStore";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { SwapTrack, type SwapPreview } from "./SwapTrack";
import { getTrackTitleMargin, getTrackWrapperHeight, TrackFrame } from "./TrackFrame";
import type { PanDragHandlers } from "./usePanDrag";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function getTracksHeight(tracks: TrackConfigBase[], titleSize: number) {
  return tracks.reduce((total, track) => total + getTrackWrapperHeight(track, titleSize), 0);
}

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
  trackStore,
  startY,
  svg,
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
  trackStore: TrackStoreInstance;
  startY: number;
  svg: SVGSVGElement | null;
}) {
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  const handlePreviewChange = useCallback((preview: SwapPreview) => {
    setSwapPreview((current) => (isSamePreview(current, preview) ? current : preview));
  }, []);
  const handlePreviewEnd = useCallback(() => {
    setSwapPreview(null);
  }, []);
  let y = startY;

  return tracks.map((track, index) => {
    const trackY = y;
    const wrapperHeight = getTrackWrapperHeight(track, titleSize);
    const titleMargin = getTrackTitleMargin(track, titleSize);
    const previewOffsetY = getPreviewOffsetY(index, track.id, tracks, titleSize, swapPreview);
    y += wrapperHeight;

    return (
      <SwapTrack
        key={track.id}
        track={track}
        trackStore={trackStore}
        titleSize={titleSize}
        svg={svg}
        disabled={isPanLocked}
        onPreviewChange={handlePreviewChange}
        onPreviewEnd={handlePreviewEnd}
      >
        <TrackFrame
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
          trackStore={trackStore}
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
      </SwapTrack>
    );
  });
}

function isSamePreview(a: SwapPreview | null, b: SwapPreview) {
  return (
    a?.draggedId === b.draggedId &&
    a.currentIndex === b.currentIndex &&
    a.targetIndex === b.targetIndex
  );
}

function getPreviewOffsetY(
  index: number,
  trackId: string,
  tracks: TrackConfigBase[],
  titleSize: number,
  preview: SwapPreview | null,
) {
  if (!preview || trackId === preview.draggedId) return 0;
  const draggedTrack = tracks[preview.currentIndex];
  if (!draggedTrack) return 0;
  const draggedHeight = getTrackWrapperHeight(draggedTrack, titleSize);

  if (preview.targetIndex > preview.currentIndex) {
    return index > preview.currentIndex && index <= preview.targetIndex ? -draggedHeight : 0;
  }
  if (preview.targetIndex < preview.currentIndex) {
    return index >= preview.targetIndex && index < preview.currentIndex ? draggedHeight : 0;
  }
  return 0;
}

function TrackContent({
  track,
  dataState,
  registry,
  region,
  width,
  height,
  titleMargin,
  panDrag,
}: {
  track: TrackConfigBase;
  dataState: DataState;
  registry: ModuleRegistry;
  region: BrowserRegion;
  width: number;
  height: number;
  titleMargin: number;
  panDrag?: PanDragHandlers;
}) {
  if (dataState.status === "loading") {
    return <LoadingState x={0} y={0} width={width} height={height} />;
  }
  if (dataState.status === "error") {
    return (
      <ErrorState
        x={0}
        y={0}
        width={width}
        height={height + titleMargin}
        message={dataState.error}
      />
    );
  }

  try {
    const module = registry.get(track.type);
    const validatedTrack = module.validate(track);
    const Renderer = module.render[track.display] as
      | ComponentType<TrackRendererProps<TrackConfigBase, unknown>>
      | undefined;
    if (!Renderer) {
      return (
        <ErrorState
          x={0}
          y={0}
          width={width}
          height={height}
          message={`Display "${track.display}" is not supported by "${track.type}"`}
        />
      );
    }
    return (
      <Renderer
        config={validatedTrack}
        data={dataState.data}
        region={region}
        width={width}
        height={height}
        panDrag={panDrag}
      />
    );
  } catch (error) {
    return (
      <ErrorState
        x={0}
        y={0}
        width={width}
        height={height}
        message={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }
}
