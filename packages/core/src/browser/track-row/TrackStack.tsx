import { useCallback, useState } from "react";
import type { GenomicRegion } from "../../genome/region";
import { isSameSwapPreview } from "./trackSwapMath";
import type { SwapPreview } from "./swapTypes";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import type { TrackStoreInstance } from "../state/trackStore";
import { TrackRow } from "./TrackRow";
import type { DataStoreInstance } from "../data/types";
import { getTrackDataState } from "../data/dataStore";
import type { TrackLayout } from "./trackLayout";

export function TrackStack({
  trackStore,
  useDataStore,
  trackLayouts,
  region,
  marginWidth,
  trackWidth,
  contentX,
  contentWidth,
  registerContentGroup,
  panDrag,
  isPanLocked,
  titleSize,
}: {
  trackStore: TrackStoreInstance;
  useDataStore: DataStoreInstance;
  trackLayouts: TrackLayout[];
  region: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  contentWidth?: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
  panDrag?: PanDragHandlers;
  isPanLocked?: boolean;
  titleSize: number;
}) {
  const useTrackStore = trackStore;
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  const handlePreviewChange = useCallback((preview: SwapPreview) => {
    setSwapPreview((current) => (isSameSwapPreview(current, preview) ? current : preview));
  }, []);
  const handlePreviewEnd = useCallback(() => {
    setSwapPreview(null);
  }, []);
  return trackLayouts.map((layout) => (
    <ConnectedTrackRow
      key={layout.id}
      trackStore={useTrackStore}
      useDataStore={useDataStore}
      layout={layout}
      region={region}
      marginWidth={marginWidth}
      trackWidth={trackWidth}
      contentX={contentX}
      contentWidth={contentWidth}
      registerContentGroup={registerContentGroup}
      panDrag={panDrag}
      isPanLocked={isPanLocked}
      disableHover={!!swapPreview}
      titleSize={titleSize}
      previewOffsetY={getPreviewOffsetY(layout, trackLayouts, swapPreview)}
      onPreviewChange={handlePreviewChange}
      onPreviewEnd={handlePreviewEnd}
    />
  ));
}

function ConnectedTrackRow({
  trackStore,
  useDataStore,
  layout,
  region,
  marginWidth,
  trackWidth,
  contentX,
  contentWidth,
  registerContentGroup,
  panDrag,
  isPanLocked,
  disableHover,
  titleSize,
  previewOffsetY,
  onPreviewChange,
  onPreviewEnd,
}: {
  trackStore: TrackStoreInstance;
  useDataStore: DataStoreInstance;
  layout: TrackLayout;
  region: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  contentWidth?: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
  panDrag?: PanDragHandlers;
  isPanLocked?: boolean;
  disableHover: boolean;
  titleSize: number;
  previewOffsetY: number;
  onPreviewChange: (preview: SwapPreview) => void;
  onPreviewEnd: () => void;
}) {
  const useTrackStore = trackStore;
  const track = useTrackStore((state) =>
    state.tracks[layout.index]?.base.id === layout.id ? state.tracks[layout.index] : undefined,
  );
  const dataState = useDataStore((state) =>
    getTrackDataState(state.data[layout.id], state.fetchingTrackIds.has(layout.id)),
  );

  if (!track) return null;

  return (
    <TrackRow
      track={track}
      dataState={dataState}
      region={region}
      y={layout.y}
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
      onPreviewChange={onPreviewChange}
      onPreviewEnd={onPreviewEnd}
    />
  );
}

function getPreviewOffsetY(
  layout: TrackLayout,
  trackLayouts: TrackLayout[],
  preview: SwapPreview | null,
) {
  if (!preview || layout.id === preview.draggedId) return 0;
  const draggedHeight = trackLayouts[preview.currentIndex]?.wrapperHeight;
  if (draggedHeight === undefined) return 0;

  if (preview.targetIndex > preview.currentIndex) {
    return layout.index > preview.currentIndex && layout.index <= preview.targetIndex
      ? -draggedHeight
      : 0;
  }
  if (preview.targetIndex < preview.currentIndex) {
    return layout.index >= preview.targetIndex && layout.index < preview.currentIndex
      ? draggedHeight
      : 0;
  }
  return 0;
}
