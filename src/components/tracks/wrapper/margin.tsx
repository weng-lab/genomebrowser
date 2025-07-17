import SettingsIcon from "../../../icons/settingsIcon";
import TopIcon from "../../../icons/topIcon";
import { useModalStore, useTrackStore, useBrowserStore, useTheme } from "../../../store/BrowserContext";
import { useRef } from "react";
import { BigWigConfig } from "../bigwig/types";

export default function Margin({
  marginLabel,
  id,
  height,
  color,
  swapping,
  onHover,
  onLeave,
  verticalMargin,
}: {
  marginLabel: string;
  id: string;
  height: number;
  color: string;
  swapping: boolean;
  verticalMargin: number;
  onHover: () => void;
  onLeave: () => void;
}) {
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const fontSize = 10;
  const showModal = useModalStore((state) => state.showModal);
  const settingsRef = useRef<SVGGElement>(null);

  const getTrackIndex = useTrackStore((state) => state.getTrackIndex);
  const shiftTracks = useTrackStore((state) => state.shiftTracks);
  const index = getTrackIndex(id);

  const handleShowModal = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (settingsRef.current) {
      const rect = settingsRef.current.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.top - 100,
      };
      showModal(id, position);
    }
  };

  const handleBringToTop = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    shiftTracks(id, 0);
  };

  const range = useTrackStore((state) => (state.getTrack(id) as BigWigConfig)?.range);
  const customRange = useTrackStore((state) => (state.getTrack(id) as BigWigConfig)?.customRange);
  const viewableRange = customRange || range;

  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);

  return (
    <g
      id={`margin-${id}`}
      height={height}
      preserveAspectRatio="xMinYMin meet"
      onMouseMove={onHover}
      onMouseLeave={onLeave}
    >
      {/* margin background */}
      <rect
        className="swap-handle"
        x={0}
        y={0}
        width={marginWidth}
        height={height}
        fill={background}
        style={{ cursor: id === "ruler" ? "default" : swapping ? "grabbing" : "grab" }}
      />
      {/* colored bar */}
      <rect x={0} y={0} width={marginWidth / 15} height={height} stroke="#000000" strokeWidth={0.5} fill={color} />
      {/* margin label */}
      <text fill={text} fontSize={`${fontSize}px`} y={height / 2} x={marginWidth / 10} alignmentBaseline="middle">
        {marginLabel}
      </text>
      <g id={`margin-buttons-${id}`}>
        {/* modal icon */}
        {id !== "ruler" && (
          <g ref={settingsRef} onClick={handleShowModal} style={{ cursor: "pointer" }}>
            <SettingsIcon x={marginWidth / 10} y={height / 2 + 2} height={15} width={15} fill={text} />
            <circle cx={marginWidth / 10 + 7.5} cy={height / 2 + 10} r={7.5} strokeWidth={0} fill="transparent" />
          </g>
        )}
        {/* bring to top icon */}
        {index > 0 && (
          <g onClick={handleBringToTop} style={{ cursor: "pointer" }}>
            <TopIcon x={marginWidth / 10 + 15} y={height / 2 + 4} height={15} width={15} fill={text} />
            <circle cx={marginWidth / 10 + 22.5} cy={height / 2 + 10} r={7.5} strokeWidth={0} fill="transparent" />
          </g>
        )}
      </g>
      {/* margin ticks */}
      {viewableRange && (
        <>
          <MarginTick color={text} position={height} width={marginWidth} fontSize={8}>
            {viewableRange.min.toFixed(2)}
          </MarginTick>
          <MarginTick color={text} position={verticalMargin} width={marginWidth} fontSize={8}>
            {viewableRange.max.toFixed(2)}
          </MarginTick>
        </>
      )}
      {/* margin right edge */}
      <line stroke={"#ccc"} x1={marginWidth} x2={marginWidth} y1={0} y2={height} />
    </g>
  );
}

function MarginTick({
  position,
  width,
  children,
  fontSize,
  color,
}: {
  position: number;
  width: number;
  fontSize: number;
  children: React.ReactNode;
  color: string;
}) {
  return (
    <>
      <text
        fill={color}
        textAnchor="end"
        alignmentBaseline="middle"
        y={position - 3}
        x={width * 0.94}
        fontSize={`${fontSize}px`}
      >
        {children}
      </text>
      <line x1={width * 0.96} x2={width} y1={position} y2={position} stroke={color} />
    </>
  );
}
