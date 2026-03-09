import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import ErrorIcon from "../../../icons/errorIcon";
import LoadingSpinner from "../../../icons/loadingSpinner";
import {
  useBrowserStore,
  useContextMenuStore,
  useDataStore,
  useTheme,
  useTrackStore,
} from "../../../store/BrowserContext";
import { RULER_HEIGHT } from "../ruler/ruler";
import DragTrack from "./DragTrack";
import Margin from "./Margin";
import SwapTrack from "./SwapTrack";
import { getTrackTitleSize } from "./frameLayout";
import { useTrackFrameLayout } from "./useTrackFrameLayout";

export default function TrackFrame({ id }: { id: string }) {
  const [hover, setHover] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const { browserWidth, marginWidth, browserTitleSize, getTrackDimensions } = useBrowserStore(
    useShallow((state) => ({
      browserWidth: state.browserWidth,
      marginWidth: state.marginWidth,
      browserTitleSize: state.titleSize,
      getTrackDimensions: state.getTrackDimensions,
    }))
  );
  const track = useTrackStore((state) => state.getTrack(id));
  const trackDataState = useDataStore((state) => state.trackData.get(id));
  const setContextMenu = useContextMenuStore((state) => state.setContextMenu);
  const { background, text } = useTheme(
    useShallow((state) => ({
      background: state.background,
      text: state.text,
    }))
  );
  const { layout, reorderDistances } = useTrackFrameLayout(id);

  const trackWidth = browserWidth - marginWidth;
  const isLoading = !trackDataState || (trackDataState.data === null && trackDataState.error === null);
  const error = trackDataState?.error ?? undefined;
  const data = trackDataState?.data ?? undefined;

  const content = useMemo(() => {
    if (!track || !data) return null;

    const Renderer = track.definition.renderers[track.displayMode];
    if (!Renderer) return null;

    return <Renderer {...track} data={data} dimensions={getTrackDimensions()} />;
  }, [data, getTrackDimensions, track]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      e.preventDefault();
      setContextMenu(true, id, e.pageX, e.pageY);
    },
    [id, setContextMenu]
  );

  if (!track || !layout) {
    return null;
  }

  const titleSize = getTrackTitleSize(track, browserTitleSize);
  const frameColor = track.color || background;
  const spinnerSize = layout.height / 3;
  const statusX = marginWidth + (trackWidth - spinnerSize) / 2;
  const statusY = (layout.height - spinnerSize) / 2;

  return (
    <g id={`track-frame-${id}`} transform={`translate(0, ${layout.y + RULER_HEIGHT})`}>
      <SwapTrack
        id={id}
        distances={reorderDistances}
        height={layout.height}
        layoutY={layout.y}
        setSwapping={setSwapping}
        width={trackWidth}
      >
        {error && (
          <g transform={`translate(${statusX},${statusY})`}>
            <ErrorIcon outline={text} inside={background} width={spinnerSize} height={spinnerSize} />
            <g transform={`translate(${spinnerSize / 2},${spinnerSize + 10})`}>
              <text fill={text} textAnchor="middle" fontSize={`${titleSize}px`}>
                {error}
              </text>
            </g>
          </g>
        )}

        {!error && isLoading && (
          <g transform={`translate(${statusX},${statusY})`}>
            <LoadingSpinner color={text} width={spinnerSize} height={spinnerSize} />
          </g>
        )}

        {!isLoading && !error && (
          <DragTrack id={id}>
            <g transform={`translate(${marginWidth},${layout.titleHeight})`} onContextMenu={handleContextMenu}>
              {content}
            </g>
          </DragTrack>
        )}

        <text
          fill={text}
          x={marginWidth + trackWidth / 2}
          y={titleSize / 2 + 5}
          fontSize={`${titleSize}px`}
          textAnchor="middle"
          alignmentBaseline="baseline"
        >
          {track.title}
        </text>

        <Margin
          id={id}
          height={layout.height}
          color={frameColor}
          swapping={swapping}
          verticalMargin={layout.titleHeight}
          onHover={() => setHover(true)}
          onLeave={() => setHover(false)}
        />

        {hover && (
          <rect
            width={browserWidth}
            height={layout.height}
            fill={track.color || "transparent"}
            fillOpacity={0.25}
            style={{ pointerEvents: "none" }}
          />
        )}
      </SwapTrack>
    </g>
  );
}
