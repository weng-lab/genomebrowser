import {
  memo,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { GenomicRegion } from "../../../genome/region";
import { useDataController, useGenomeBrowser } from "../../state/browserContextState";
import { getContentPlacement } from "../../viewport/renderWindow";
import { trackOverlayContext } from "../../track-overlay/context";
import { RenderErrorBoundary } from "../../RenderErrorBoundary";
import { useTrackStack } from "../trackStackContext";
import { PanTrack } from "../frame/PanTrack";
import { TrackContent } from "./TrackContent";
import { ErrorState } from "./ErrorState";

/** Hosts one ordinary track, whether standalone or inside a composite row. */
export const TrackPlot = memo(function TrackPlot({
  trackId,
  visibleRegion,
  height,
  y = 0,
  opacity = 1,
  isDragClone = false,
}: {
  trackId: string;
  visibleRegion: GenomicRegion;
  height: number;
  y?: number;
  opacity?: number;
  isDragClone?: boolean;
}) {
  const { useTrackStore } = useGenomeBrowser();
  const track = useTrackStore((state) => state.getTrack(trackId));
  const controller = useDataController();
  const getData = () => controller.getTrack(trackId);
  const dataState = useSyncExternalStore(controller.subscribe, getData, getData);
  const { marginWidth, trackWidth, registerContentGroup, panDrag } = useTrackStack();
  const region = dataState.status === "loading" ? visibleRegion : dataState.region;
  const placement = getContentPlacement(region, visibleRegion, trackWidth, marginWidth);
  const contentRef = useRef<SVGGElement>(null);
  const clipId = useId();
  const [target, setTarget] = useState<SVGGElement | null>(null);
  const overlay = useMemo(
    () => ({ target, width: trackWidth, height }),
    [target, trackWidth, height],
  );
  const loaded = dataState.status !== "loading";
  useLayoutEffect(() => {
    if (isDragClone || !contentRef.current) return;
    return registerContentGroup(contentRef.current, {
      x: placement.x,
      width: loaded ? placement.width : undefined,
    });
  }, [isDragClone, loaded, placement.x, placement.width, registerContentGroup]);
  if (!track) return null;
  return (
    <g transform={`translate(0,${y})`} opacity={opacity} data-track-plot={trackId}>
      <defs>
        <clipPath id={clipId}>
          <rect x={marginWidth} width={trackWidth} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g ref={contentRef} transform={isDragClone ? `translate(${placement.x},0)` : undefined}>
          <PanTrack panDrag={panDrag} width={placement.width} height={height}>
            <trackOverlayContext.Provider value={overlay}>
              <RenderErrorBoundary
                resetKeys={[track, dataState]}
                fallback={
                  <ErrorState message={`Track unavailable: ${track.base.title || trackId}`} />
                }
                onError={(error, info) =>
                  console.error("[genomebrowser] Track render error", {
                    track: {
                      id: trackId,
                      type: track.type,
                      display: track.base.display,
                      title: track.base.title,
                    },
                    error,
                    componentStack: info.componentStack,
                  })
                }
              >
                <TrackContent
                  track={track}
                  dataState={dataState}
                  visibleRegion={visibleRegion}
                  region={region}
                  width={placement.width}
                  height={height}
                />
              </RenderErrorBoundary>
            </trackOverlayContext.Provider>
          </PanTrack>
        </g>
        <g ref={setTarget} transform={`translate(${marginWidth},0)`} pointerEvents="none" />
      </g>
    </g>
  );
});
