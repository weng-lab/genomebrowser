import { useEffect, useState } from "react";
import DragTrack from "./dragTrack";
import Margin from "./margin";
import SwapTrack from "./swapTrack";
import { useTrackStore } from "../../store/tracksStore";
import { useBrowserStore } from "../../store/browserStore";
import LoadingSpinner from "../../icons/loadingSpinner";
import ErrorIcon from "../../icons/errorIcon";

export interface WrapperProps {
  transform: string;
  color: string;
  id: string;
  title: string;
  shortLabel: string;
  loading: boolean;
  error: string;
  children: React.ReactNode;
}

export default function Wrapper({ children, transform, color, id, title, shortLabel, loading, error }: WrapperProps) {
  const [swapping, setSwapping] = useState(false);
  const [hover, setHover] = useState(false);

  const onHover = () => {
    setHover(true);
  };
  const onLeave = () => {
    setHover(false);
  };

  useEffect(() => {
    if (!swapping) {
      setHover(false);
    }
  }, [swapping]);

  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const browserWidth = useBrowserStore((state) => state.browserWidth);
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const getDimensions = useTrackStore((state) => state.getDimensions);
  const { trackMargin, titleSize, totalVerticalMargin, wrapperHeight } = getDimensions(id);

  const spinnerSize = wrapperHeight / 3;

  const marginLabel = getShortLabel(shortLabel || "", title || "");

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
            <g transform={`translate(${marginWidth},${totalVerticalMargin})`}>{children}</g>
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
          marginLabel={marginLabel}
          id={id}
          height={wrapperHeight}
          color={color}
          swapping={swapping}
          onHover={onHover}
          onLeave={onLeave}
        />
        {/* hover effect */}
        {hover && (
          <rect
            width={browserWidth}
            height={wrapperHeight}
            fill={color || "transparent"}
            fillOpacity={0.45}
            style={{ pointerEvents: "none" }}
          />
        )}
      </SwapTrack>
    </g>
  );
}

const getShortLabel = (shortLabel: string, title: string) => {
  if (shortLabel) return shortLabel;
  if (!title || !title.substring || !title.length) return "";
  return title.length <= 20 ? title : title.substring(0, 20) + "...";
};
