import { useRef } from "react";
import BottomIcon from "../../../icons/bottomIcon";
import SettingsIcon from "../../../icons/settingsIcon";
import TopIcon from "../../../icons/topIcon";
import { useBrowserStore, useModalStore, useTheme, useTrackStore } from "../../../store/BrowserContext";
import type { BigWigTrack } from "../bigwig/definition";

interface MarginProps {
  color: string;
  height: number;
  id: string;
  onHover: () => void;
  onLeave: () => void;
  swapping: boolean;
  verticalMargin: number;
}

export default function Margin({ color, height, id, onHover, onLeave, swapping, verticalMargin }: MarginProps) {
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const fontSize = useBrowserStore((state) => state.fontSize);
  const tickFontSize = fontSize * 0.8;
  const showModal = useModalStore((state) => state.showModal);
  const settingsRef = useRef<SVGGElement>(null);

  const getTrackIndex = useTrackStore((state) => state.getTrackIndex);
  const shiftTracks = useTrackStore((state) => state.shiftTracks);
  const trackCount = useTrackStore((state) => state.tracks.length);
  const index = getTrackIndex(id);

  const canBringToTop = index > 0;
  const canBringToBottom = index < trackCount - 1;

  const range = useTrackStore((state) => (state.getTrack(id) as BigWigTrack)?.range);
  const customRange = useTrackStore((state) => (state.getTrack(id) as BigWigTrack)?.customRange);
  const viewableRange = customRange || range;

  const background = useTheme((state) => state.background);
  const text = useTheme((state) => state.text);
  const isRuler = id === "ruler";

  const handleShowModal = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (!settingsRef.current) return;

    const rect = settingsRef.current.getBoundingClientRect();
    showModal(id, { x: rect.left, y: rect.top - 100 });
  };

  return (
    <g
      id={`margin-${id}`}
      height={height}
      preserveAspectRatio="xMinYMin meet"
      onMouseMove={onHover}
      onMouseLeave={onLeave}
    >
      <rect
        className="swap-handle"
        x={0}
        y={0}
        width={marginWidth}
        height={height}
        fill={background}
        style={{ cursor: isRuler ? "default" : swapping ? "grabbing" : "grab" }}
      />
      <rect x={0} y={0} width={marginWidth / 15} height={height} stroke="#000000" strokeWidth={0.5} fill={color} />

      <g id={`margin-buttons-${id}`}>
        {!isRuler && (
          <g ref={settingsRef} onClick={handleShowModal} style={{ cursor: "pointer" }}>
            <SettingsIcon x={marginWidth / 10} y={height / 2 + 2} height={15} width={15} fill={text} />
            <circle cx={marginWidth / 10 + 7.5} cy={height / 2 + 10} r={7.5} strokeWidth={0} fill="transparent" />
          </g>
        )}
        {!isRuler && (
          <g
            onClick={
              canBringToTop
                ? (e) => {
                    e.stopPropagation();
                    shiftTracks(id, 0);
                  }
                : undefined
            }
            style={{ cursor: "pointer" }}
          >
            <circle cx={marginWidth / 10 + 22.5} cy={height / 2 + 10} r={7.5} strokeWidth={0} fill="transparent" />
            <TopIcon
              x={marginWidth / 10 + 15}
              y={height / 2 + 3}
              height={15}
              width={15}
              fill={canBringToTop ? text : "#ccc"}
            />
          </g>
        )}
        {!isRuler && (
          <g
            onClick={
              canBringToBottom
                ? (e) => {
                    e.stopPropagation();
                    shiftTracks(id, -1);
                  }
                : undefined
            }
            style={{ cursor: "pointer" }}
          >
            <circle cx={marginWidth / 10 + 37.5} cy={height / 2 + 10} r={7.5} strokeWidth={0} fill="transparent" />
            <BottomIcon
              x={marginWidth / 10 + 30}
              y={height / 2 + 2}
              height={15}
              width={15}
              fill={canBringToBottom ? text : "#ccc"}
            />
          </g>
        )}
      </g>

      {viewableRange && (
        <>
          <MarginTick color={text} position={height} width={marginWidth} fontSize={tickFontSize}>
            {viewableRange.min.toFixed(2)}
          </MarginTick>
          <MarginTick color={text} position={verticalMargin} width={marginWidth} fontSize={tickFontSize}>
            {viewableRange.max.toFixed(2)}
          </MarginTick>
        </>
      )}

      <line stroke="#ccc" x1={marginWidth} x2={marginWidth} y1={0} y2={height} />
    </g>
  );
}

function MarginTick({
  children,
  color,
  fontSize,
  position,
  width,
}: {
  children: React.ReactNode;
  color: string;
  fontSize: number;
  position: number;
  width: number;
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
