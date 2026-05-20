import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createModuleRegistry } from "../modules/registry";
import { useTrackData } from "../modules/dataController";
import type { AnyTrackModule } from "../modules/types";
import type { BrowserStoreInstance } from "../stores/browserStore";
import type { TrackStoreInstance } from "../stores/trackStore";
import type { BrowserRegion } from "../utils/region";
import { svgPoint } from "../utils/svg";
import { PAN_COMMIT_THRESHOLD_PX, PAN_OVERSCAN_MULTIPLIER } from "./panConstants";
import { expandRegion, getPanCommitRegion } from "./panMath";
import { RULER_HEIGHT, Ruler } from "./Ruler";
import { SelectRegion } from "./SelectRegion";
import { SvgShell } from "./SvgShell";
import { getTracksHeight, TrackStack } from "./TrackStack";

export type GenomeBrowserProps = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  modules: AnyTrackModule[];
};

export function GenomeBrowser({ browserStore, trackStore, modules }: GenomeBrowserProps) {
  const region = browserStore((state) => state.region);
  const marginWidth = browserStore((state) => state.marginWidth);
  const trackWidth = browserStore((state) => state.trackWidth);
  const titleSize = browserStore((state) => state.titleSize);
  const setRegion = browserStore((state) => state.setRegion);
  const tracks = trackStore((state) => state.tracks);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const registry = useMemo(() => createModuleRegistry(modules), [modules]);
  const targetRenderRegion = useMemo(() => expandRegion(region, PAN_OVERSCAN_MULTIPLIER), [region]);
  const [displayedRenderRegion, setDisplayedRenderRegion] =
    useState<BrowserRegion>(targetRenderRegion);
  const renderWidth = trackWidth * PAN_OVERSCAN_MULTIPLIER;
  const sideWidth = trackWidth;
  const browserWidth = marginWidth + trackWidth;
  const totalHeight = RULER_HEIGHT + getTracksHeight(tracks, titleSize);
  const dragStartClientX = useRef(0);
  const dragStartDeltaPx = useRef(0);
  const deltaPxRef = useRef(0);
  const regionRef = useRef(region);
  const trackWidthRef = useRef(trackWidth);
  const isInteractionLockedRef = useRef(isInteractionLocked);
  const contentGroupsRef = useRef(new Set<SVGGElement>());

  regionRef.current = region;
  trackWidthRef.current = trackWidth;
  isInteractionLockedRef.current = isInteractionLocked;

  const baseContentX = marginWidth - sideWidth;

  const setContentOffset = useCallback(
    (nextDeltaPx: number) => {
      deltaPxRef.current = nextDeltaPx;
      for (const contentGroup of contentGroupsRef.current) {
        contentGroup.setAttribute("transform", `translate(${baseContentX + nextDeltaPx},0)`);
      }
    },
    [baseContentX],
  );

  const registerContentGroup = useCallback(
    (node: SVGGElement) => {
      contentGroupsRef.current.add(node);
      node.setAttribute("transform", `translate(${baseContentX + deltaPxRef.current},0)`);
      return () => {
        contentGroupsRef.current.delete(node);
      };
    },
    [baseContentX],
  );

  useEffect(() => {
    setContentOffset(deltaPxRef.current);
  }, [setContentOffset]);

  const handleDataSettled = useCallback(() => {
    setDisplayedRenderRegion(targetRenderRegion);
    setContentOffset(0);
    setIsInteractionLocked(false);
  }, [setContentOffset, targetRenderRegion]);

  const dataStates = useTrackData(tracks, targetRenderRegion, renderWidth, registry, {
    keepPreviousSuccess: true,
    onSettled: handleDataSettled,
  });

  const handlePanMouseDown = (event: React.MouseEvent<SVGGElement>) => {
    if (isInteractionLockedRef.current) return;
    if (!svg) return;
    const point = svgPoint(svg, event.clientX, event.clientY);
    if (!point) return;
    if (
      point.x < marginWidth ||
      point.x > marginWidth + trackWidth ||
      point.y < RULER_HEIGHT ||
      point.y > totalHeight
    )
      return;

    event.preventDefault();
    dragStartClientX.current = event.clientX;
    dragStartDeltaPx.current = deltaPxRef.current;

    const handleMove = (event: MouseEvent) => {
      event.preventDefault();
      setContentOffset(dragStartDeltaPx.current + event.clientX - dragStartClientX.current);
    };

    const handleUp = (event: MouseEvent) => {
      event.preventDefault();
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);

      const committedDeltaPx = deltaPxRef.current;
      if (Math.abs(committedDeltaPx) < PAN_COMMIT_THRESHOLD_PX) {
        setContentOffset(0);
        return;
      }

      setIsInteractionLocked(true);
      setRegion(getPanCommitRegion(regionRef.current, trackWidthRef.current, committedDeltaPx));
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  return (
    <SvgShell width={browserWidth} height={totalHeight} setSvg={setSvg}>
      <SelectRegion
        svg={svg}
        marginWidth={marginWidth}
        trackWidth={trackWidth}
        totalHeight={totalHeight}
        region={region}
        setRegion={setRegion}
        disabled={isInteractionLocked}
      />
      <g transform={`translate(${marginWidth},0)`}>
        <Ruler region={region} width={trackWidth} />
      </g>
      <g
        onMouseDownCapture={handlePanMouseDown}
        style={{ cursor: isInteractionLocked ? "default" : "grab" }}
      >
        <TrackStack
          tracks={tracks}
          dataStates={dataStates}
          registry={registry}
          region={displayedRenderRegion}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          contentX={baseContentX}
          contentWidth={renderWidth}
          registerContentGroup={registerContentGroup}
          titleSize={titleSize}
          trackStore={trackStore}
          startY={RULER_HEIGHT}
        />
      </g>
    </SvgShell>
  );
}
