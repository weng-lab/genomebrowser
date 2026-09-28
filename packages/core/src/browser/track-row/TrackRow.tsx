import { isCompositeTrack } from "../../modules/composite";
import { TrackPlot } from "./content/TrackPlot";
import { useRegistry } from "../state/browserContextState";

import type { GenomicRegion } from "../../genome/region";

import { useGenomeBrowser } from "../state/browserContextState";

import { TrackReorder } from "./reorder/TrackReorder";

import { TrackFrame } from "./frame/TrackFrame";
import type { ReorderPreview } from "./reorder/reorderMath";
import type { TrackLayout } from "./layout/trackLayout";

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
  const { useTrackStore } = useGenomeBrowser();
  const registry = useRegistry();
  const track = useTrackStore((state) =>
    state.tracks[layout.index]?.base.id === layout.id ? state.tracks[layout.index] : undefined,
  );
  if (!track) return null;
  const composite = isCompositeTrack(track, registry);
  return (
    <TrackReorder track={track} onPreviewChange={onPreviewChange} onPreviewEnd={onPreviewEnd}>
      {(swapProps) => (
        <TrackFrame
          {...swapProps}
          track={track}
          y={layout.y}
          previewOffsetY={previewOffsetY}
          disableHover={disableHover}
        >
          {composite ? (
            track.tracks.map((child, index) => {
              const y =
                track.base.display === "stack"
                  ? track.tracks
                      .slice(0, index)
                      .reduce((sum, previous) => sum + previous.base.height + track.config.gap, 0)
                  : 0;
              const height = track.base.display === "stack" ? child.base.height : track.base.height;
              return (
                <TrackPlot
                  key={child.base.id}
                  trackId={child.base.id}
                  visibleRegion={visibleRegion}
                  y={y}
                  height={height}
                  opacity={track.base.display === "overlay" ? track.config.opacity : 1}
                  isDragClone={swapProps.isDragClone}
                />
              );
            })
          ) : (
            <TrackPlot
              trackId={track.base.id}
              visibleRegion={visibleRegion}
              height={track.base.height}
              isDragClone={swapProps.isDragClone}
            />
          )}
        </TrackFrame>
      )}
    </TrackReorder>
  );
}
