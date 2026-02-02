import { useCallback, useMemo, useState } from "react";
import DragTrack from "./dragTrack";
import Margin from "./margin";
import SwapTrack from "./swapTrack";
import { useTrackStore, useBrowserStore, useContextMenuStore, useTheme } from "../../../store/BrowserContext";
import { useWrapperDimensions } from "../../../hooks/useTrackLayout";
import LoadingSpinner from "../../../icons/loadingSpinner";
import ErrorIcon from "../../../icons/errorIcon";

export interface WrapperProps {
  id: string;
  transform: string;
  loading: boolean;
  error: string | undefined;
  children: React.ReactNode;
}

export default function Wrapper({ children, transform, id, loading, error }: WrapperProps) {
  const [swapping, setSwapping] = useState(false);
  const [hover, setHover] = useState(false);

  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const browserWidth = useBrowserStore((state) => state.browserWidth);
  const trackWidth = useMemo(() => browserWidth - marginWidth, [browserWidth, marginWidth]);

  const color = useTrackStore((state) => state.getTrack(id)?.color) || "";
  const title = useTrackStore((state) => state.getTrack(id)?.title) || "";
  const { trackMargin, titleSize, totalVerticalMargin, wrapperHeight } = useWrapperDimensions(id);

  const spinnerSize = wrapperHeight / 3;
  const setContextMenu = useContextMenuStore((state) => state.setContextMenu);

  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);

  const marginHover = useCallback(() => {
    setHover(true);
  }, []);
  const marginLeave = useCallback(() => {
    setHover(false);
  }, []);

  return (
    <g id={`wrapper-${id}`} transform={transform}>
      <SwapTrack id={id} setSwapping={setSwapping} height={wrapperHeight} width={trackWidth}>
        {/* loading */}
        {loading && !error && (
          <g
            transform={`translate(${marginWidth + (trackWidth - spinnerSize) / 2},${
              (wrapperHeight - spinnerSize) / 2
            })`}
          >
            <LoadingSpinner color={text} width={spinnerSize} height={spinnerSize} />
          </g>
        )}
        {/* error */}
        {error && (
          <g
            transform={`translate(${marginWidth + (trackWidth - spinnerSize) / 2},${
              (wrapperHeight - spinnerSize) / 2
            })`}
          >
            <ErrorIcon outline={text} inside={background} width={spinnerSize} height={spinnerSize} />
            <g transform={`translate(${spinnerSize / 2},${spinnerSize + 10})`}>
              <text fill={text} textAnchor="middle" fontSize={`${titleSize}px`}>
                {error}
              </text>
            </g>
          </g>
        )}
        {/* track */}
        {!loading && !error && (
          <DragTrack id={id}>
            <g
              transform={`translate(${marginWidth},${totalVerticalMargin})`}
              onContextMenu={(e: React.MouseEvent<SVGGElement>) => {
                e.preventDefault();
                setContextMenu(true, id, e.pageX, e.pageY);
              }}
            >
              {children}
            </g>
          </DragTrack>
        )}
        {/* title */}
        <text
          fill={text}
          x={marginWidth + trackWidth / 2}
          y={titleSize / 2 + 5}
          fontSize={`${titleSize}px`}
          textAnchor="middle"
          transform={`translate(0,${trackMargin})`}
          alignmentBaseline="baseline"
        >
          {title}
        </text>
        {/* margin */}
        <Margin
          id={id}
          height={wrapperHeight}
          color={color || background}
          swapping={swapping}
          verticalMargin={totalVerticalMargin}
          onHover={marginHover}
          onLeave={marginLeave}
        />
        {/* hover effect */}
        {hover && (
          <rect
            width={browserWidth}
            height={wrapperHeight}
            fill={color || "transparent"}
            fillOpacity={0.25}
            style={{ pointerEvents: "none" }}
          />
        )}
      </SwapTrack>
    </g>
  );
}
