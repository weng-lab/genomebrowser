import { useCallback, useMemo, useState } from "react";
import type { GenomicRegion } from "../../genome/region";
import {
  isSameReorderPreview,
  getReorderPreviewOffsetY,
  type ReorderPreview,
} from "./reorder/reorderMath";
import { TrackRow } from "./TrackRow";
import type { TrackLayout } from "./layout/trackLayout";
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
  const [swapPreview, setReorderPreview] = useState<ReorderPreview | null>(null);
  const handlePreviewChange = useCallback((preview: ReorderPreview) => {
    setReorderPreview((current) => (isSameReorderPreview(current, preview) ? current : preview));
  }, []);
  const handlePreviewEnd = useCallback(() => {
    setReorderPreview(null);
  }, []);
  return (
    <TrackStackContext.Provider value={stack}>
      {trackLayouts.map((layout) => (
        <TrackRow
          key={layout.id}
          layout={layout}
          visibleRegion={visibleRegion}
          disableHover={!!swapPreview}
          previewOffsetY={getReorderPreviewOffsetY(layout, trackLayouts, swapPreview)}
          onPreviewChange={handlePreviewChange}
          onPreviewEnd={handlePreviewEnd}
        />
      ))}
    </TrackStackContext.Provider>
  );
}
