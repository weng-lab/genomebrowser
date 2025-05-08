import SettingsIcon from "../../icons/settingsIcon";
import TopIcon from "../../icons/topIcon";
import { useModalStore } from "../../store/modalStore";
import { useRef } from "react";
import { useTrackStore } from "../../store/tracksStore";

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
  const width = 150;
  const fontSize = 10;
  const showModal = useModalStore((state) => state.showModal);
  const settingsRef = useRef<SVGGElement>(null);

  const index = useTrackStore((state) => state.getTrackIndex(id));
  const shiftTracks = useTrackStore((state) => state.shiftTracks);

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

  return (
    <g id={`margin-${id}`} height={height} preserveAspectRatio="xMinYMin meet">
      <rect
        className="swap-handle"
        x={0}
        y={0}
        width={width}
        height={height}
        fill={"white"}
        style={{ cursor: swapping ? "grabbing" : "grab" }}
        onMouseMove={onHover}
        onMouseLeave={onLeave}
      />
      <rect x={0} y={0} width={width / 15} height={height} stroke="#000000" strokeWidth={0.5} fill={color} />
      <text
        fontSize={`${fontSize}px`}
        y={height / 2}
        x={width / 10}
        alignmentBaseline="middle"
        style={{
          pointerEvents: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
          userSelect: "none",
        }}
      >
        {marginLabel}
      </text>
      <MarginTick position={height} width={width} fontSize={8}>
        0
      </MarginTick>
      <MarginTick position={verticalMargin} width={width} fontSize={8}>
        100
      </MarginTick>
      <line stroke="#ccc" x1={width} x2={width} y1={0} y2={height} />
      <svg x={width / 10} y={height / 2 + 5} width={35} height={20} cursor={"pointer"}>
        <g ref={settingsRef} onClick={handleShowModal}>
          <circle cx={7.5} cy={7.5} r={7.5} strokeWidth={0} fill="transparent" />
          <SettingsIcon x={0} y={0} height={15} width={15} />
        </g>
        {index > 0 && (
          <g onClick={handleBringToTop}>
            <circle cx={22.5} cy={7.5} r={7.5} strokeWidth={0} fill="transparent" />
            <TopIcon x={15} y={2} height={15} width={15} />
          </g>
        )}
      </svg>
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
      <text
        textAnchor="end"
        alignmentBaseline="middle"
        y={position - 3}
        x={width * 0.94}
        fontSize={`${fontSize}px`}
        style={{
          pointerEvents: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
          userSelect: "none",
        }}
      >
        {children}
      </text>
      <line x1={width * 0.96} x2={width} y1={position} y2={position} stroke="#aaa" />
    </>
  );
}
