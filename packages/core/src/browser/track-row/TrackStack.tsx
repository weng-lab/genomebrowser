import { useCallback, useMemo, useState } from "react";
import type { GenomicRegion } from "../../genome/region";
import { isSameSwapPreview } from "./trackSwapMath";
import type { SwapPreview } from "./swapTypes";
import { TrackRow } from "./TrackRow";
import type { TrackLayout } from "./trackLayout";
import { TrackStackContext, type TrackStackContextValue } from "./trackStackContext";

export function TrackStack({
  trackLayouts,
  visibleRegion,
  marginWidth,
  trackWidth,
  titleSize,
  registerContentGroup,
  panDrag,
}: TrackStackContextValue & {
  trackLayouts: TrackLayout[];
  visibleRegion: GenomicRegion;
}) {
  const stack = useMemo(
    () => ({ marginWidth, trackWidth, titleSize, registerContentGroup, panDrag }),
    [marginWidth, trackWidth, titleSize, registerContentGroup, panDrag],
  );
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  const handlePreviewChange = useCallback((preview: SwapPreview) => {
    setSwapPreview((current) => (isSameSwapPreview(current, preview) ? current : preview));
  }, []);
  const handlePreviewEnd = useCallback(() => {
    setSwapPreview(null);
  }, []);
  return (
    <TrackStackContext.Provider value={stack}>
      {trackLayouts.map((layout) => (
        <TrackRow
          key={layout.id}
          layout={layout}
          visibleRegion={visibleRegion}
          disableHover={!!swapPreview}
          previewOffsetY={getPreviewOffsetY(layout, trackLayouts, swapPreview)}
          onPreviewChange={handlePreviewChange}
          onPreviewEnd={handlePreviewEnd}
        />
      ))}
    </TrackStackContext.Provider>
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
