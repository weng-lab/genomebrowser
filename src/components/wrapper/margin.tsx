import SettingsIcon from "../../icons/settingsIcon";
import TopIcon from "../../icons/topIcon";
import { useModalStore } from "../../store/modalStore";
import { useRef } from "react";
import { useTrackStore } from "../../store/trackStore";
import { useBrowserStore } from "../../store/browserStore";

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

  const range = useTrackStore((state) => state.getTrack(id)?.range);

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
        fill={"white"}
        style={{ cursor: swapping ? "grabbing" : "grab" }}
      />
      {/* colored bar */}
      <rect x={0} y={0} width={marginWidth / 15} height={height} stroke="#000000" strokeWidth={0.5} fill={color} />
      {/* margin label */}
      <text fontSize={`${fontSize}px`} y={height / 2} x={marginWidth / 10} alignmentBaseline="middle">
        {marginLabel}
      </text>
      {/* modal icon */}
      <g ref={settingsRef} onClick={handleShowModal} style={{ cursor: "pointer" }}>
        <SettingsIcon x={marginWidth / 10} y={height / 2 + 2} height={15} width={15} />
        <circle cx={marginWidth / 10 + 7.5} cy={height / 2 + 10} r={7.5} strokeWidth={0} fill="transparent" />
      </g>
      {/* bring to top icon */}
      {index > 0 && (
        <g onClick={handleBringToTop} style={{ cursor: "pointer" }}>
          <TopIcon x={marginWidth / 10 + 15} y={height / 2 + 4} height={15} width={15} />
          <circle cx={marginWidth / 10 + 22.5} cy={height / 2 + 10} r={7.5} strokeWidth={0} fill="transparent" />
        </g>
      )}
      {/* margin ticks */}
      {range && (
        <>
          <MarginTick position={height} width={marginWidth} fontSize={8}>
            {range.min.toFixed(2)}
          </MarginTick>
          <MarginTick position={verticalMargin} width={marginWidth} fontSize={8}>
            {range.max.toFixed(2)}
          </MarginTick>
        </>
      )}
      {/* margin right edge */}
      <line stroke="#ccc" x1={marginWidth} x2={marginWidth} y1={0} y2={height} />
    </g>
  );
}

function MarginTick({
  position,
  width,
  children,
  fontSize,
}: {
  position: number;
  width: number;
  fontSize: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <text textAnchor="end" alignmentBaseline="middle" y={position - 3} x={width * 0.94} fontSize={`${fontSize}px`}>
        {children}
      </text>
      <line x1={width * 0.96} x2={width} y1={position} y2={position} stroke="#aaa" />
    </>
  );
}
