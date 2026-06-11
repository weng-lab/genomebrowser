import { useCallback, useState } from "react";
import type { DataState } from "../../data/types";
import type { createModuleRegistry } from "../../modules/registry";
import type { TrackConfigBase } from "../../modules/types";
import type { BrowserRegion } from "../../utils/region";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { SwapTrack, type SwapPreview } from "./SwapTrack";
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
        titleSize={titleSize}
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
