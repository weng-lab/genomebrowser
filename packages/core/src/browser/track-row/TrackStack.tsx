import { useCallback, useState, useSyncExternalStore } from "react";
import type { GenomicRegion } from "../../genome/region";
import { isSameSwapPreview } from "./trackSwapMath";
import type { SwapPreview } from "./swapTypes";
import type { RegisterContentGroup } from "../viewport/useContentTransform";
import type { PanDragHandlers } from "../viewport/usePanDrag";
import { getContentPlacement } from "../viewport/renderWindow";
import type { TrackStoreInstance } from "../state/trackStore";
import { TrackRow } from "./TrackRow";
import type { TrackDataController } from "../data/trackDataController";
import type { TrackLayout } from "./trackLayout";

export function TrackStack({
  trackStore,
  dataController,
  trackLayouts,
  visibleRegion,
  marginWidth,
  trackWidth,
  registerContentGroup,
  panDrag,
  titleSize,
}: {
  trackStore: TrackStoreInstance;
  dataController: TrackDataController;
  trackLayouts: TrackLayout[];
  visibleRegion: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  registerContentGroup?: RegisterContentGroup;
  panDrag?: PanDragHandlers;
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
      dataController={dataController}
      layout={layout}
      visibleRegion={visibleRegion}
      marginWidth={marginWidth}
      trackWidth={trackWidth}
      registerContentGroup={registerContentGroup}
      panDrag={panDrag}
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
  dataController,
  layout,
  visibleRegion,
  marginWidth,
  trackWidth,
  registerContentGroup,
  panDrag,
  disableHover,
  titleSize,
  previewOffsetY,
  onPreviewChange,
  onPreviewEnd,
}: {
  trackStore: TrackStoreInstance;
  dataController: TrackDataController;
  layout: TrackLayout;
  visibleRegion: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  registerContentGroup?: RegisterContentGroup;
  panDrag?: PanDragHandlers;
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
  // Each row subscribes to its own entry, so one track's result renders only its row.
  const getDataState = () => dataController.getTrack(layout.id);
  const dataState = useSyncExternalStore(dataController.subscribe, getDataState, getDataState);

  if (!track) return null;

  // Each track is placed from the region its own data covers.
  const dataRegion = dataState.status === "loading" ? visibleRegion : dataState.region;
  const placement = getContentPlacement(dataRegion, visibleRegion, trackWidth, marginWidth);

  return (
    <TrackRow
      track={track}
      dataState={dataState}
      visibleRegion={visibleRegion}
      region={dataRegion}
      y={layout.y}
      previewOffsetY={previewOffsetY}
      marginWidth={marginWidth}
      trackWidth={trackWidth}
      contentX={placement.x}
      contentWidth={placement.width}
      registerContentGroup={registerContentGroup}
      panDrag={panDrag}
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
