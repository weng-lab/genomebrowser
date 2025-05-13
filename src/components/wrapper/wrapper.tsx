import { useState } from "react";
import DragTrack from "./dragTrack";
import Margin from "./margin";
import SwapTrack from "./swapTrack";
import { DisplayMode, TrackType, useTrackStore } from "../../store/trackStore";
import { useBrowserStore } from "../../store/browserStore";
import LoadingSpinner from "../../icons/loadingSpinner";
import ErrorIcon from "../../icons/errorIcon";
import { useContextMenuStore } from "../../store/contestMenuStore";

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

  const onHover = () => {
    setHover(true);
  };
  const onLeave = () => {
    setHover(false);
  };

  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const browserWidth = useBrowserStore((state) => state.browserWidth);
  const trackWidth = browserWidth - marginWidth;
  const getDimensions = useTrackStore((state) => state.getDimensions);
  const createShortLabel = useTrackStore((state) => state.createShortLabel);

  const color = useTrackStore((state) => state.getTrack(id)?.color);
  const title = useTrackStore((state) => state.getTrack(id)?.title);
  const { trackMargin, titleSize, totalVerticalMargin, wrapperHeight } = getDimensions(id);
  const shortLabel = createShortLabel(id);

  const spinnerSize = wrapperHeight / 3;
  const setContextMenu = useContextMenuStore((state) => state.setContextMenu);
  return (
    <g id={`wrapper-${id}`} transform={transform}>
      <SwapTrack id={id} setSwapping={setSwapping}>
        {/* background */}
        <rect width={browserWidth} height={wrapperHeight} fill={"white"} style={{ pointerEvents: "none" }} />
        {/* loading */}
        {loading && (
          <g
            transform={`translate(${marginWidth + (trackWidth - spinnerSize) / 2},${
              (wrapperHeight - spinnerSize) / 2
            })`}
          >
            <LoadingSpinner width={spinnerSize} height={spinnerSize} />
          </g>
        )}
        {/* error */}
        {error && (
          <g
            transform={`translate(${marginWidth + (trackWidth - spinnerSize) / 2},${
              (wrapperHeight - spinnerSize) / 2
            })`}
          >
            <ErrorIcon width={spinnerSize} height={spinnerSize} />
            <g transform={`translate(${spinnerSize / 2},${spinnerSize + 10})`}>
              <text textAnchor="middle" fontSize={`${titleSize}px`}>
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
          fill={"#000000"}
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
          marginLabel={shortLabel}
          height={wrapperHeight}
          color={color || "#ffffff"}
          swapping={swapping}
          verticalMargin={totalVerticalMargin}
          onHover={onHover}
          onLeave={onLeave}
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
