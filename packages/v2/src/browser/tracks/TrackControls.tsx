import { useRef } from "react";
import type { TrackConfigBase } from "../../modules/types";
import { useSettingsStore, useTrackStore } from "../../stores/BrowserContext";
import { BottomIcon, SettingsIcon, TopIcon } from "../icons";

export function TrackControls({
  track,
  marginWidth,
  wrapperHeight,
}: {
  track: TrackConfigBase;
  marginWidth: number;
  wrapperHeight: number;
}) {
  const settingsButtonRef = useRef<SVGGElement>(null);
  const openSettings = useSettingsStore((state) => state.openSettings);
  const order = useTrackStore((state) => state.order);
  const reorderTracks = useTrackStore((state) => state.reorderTracks);
  const index = order.indexOf(track.id);
  const canMoveTop = index > 0;
  const canMoveBottom = index >= 0 && index < order.length - 1;

  const moveTrack = (target: "top" | "bottom") => {
    const nextOrder = order.filter((id) => id !== track.id);
    if (target === "top") nextOrder.unshift(track.id);
    if (target === "bottom") nextOrder.push(track.id);
    reorderTracks(nextOrder);
  };

  const handleOpenSettings = (event: React.MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    const rect = settingsButtonRef.current?.getBoundingClientRect();
    openSettings(track.id, rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 });
  };

  return (
    <g>
      <g
        ref={settingsButtonRef}
        onClick={handleOpenSettings}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ cursor: "pointer" }}
      >
        <circle
          cx={marginWidth / 10 + 7.5}
          cy={wrapperHeight / 2 + 10}
          r={7.5}
          strokeWidth={0}
          fill="transparent"
        />
        <SettingsIcon
          x={marginWidth / 10}
          y={wrapperHeight / 2 + 3}
          height={15}
          width={15}
          fill="#000000"
        />
      </g>
      <g
        onClick={canMoveTop ? () => moveTrack("top") : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ cursor: canMoveTop ? "pointer" : "default" }}
      >
        <circle
          cx={marginWidth / 10 + 22.5}
          cy={wrapperHeight / 2 + 10}
          r={7.5}
          strokeWidth={0}
          fill="transparent"
        />
        <TopIcon
          x={marginWidth / 10 + 15}
          y={wrapperHeight / 2 + 3}
          height={15}
          width={15}
          fill={canMoveTop ? "#000000" : "#cccccc"}
        />
      </g>
      <g
        onClick={canMoveBottom ? () => moveTrack("bottom") : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ cursor: canMoveBottom ? "pointer" : "default" }}
      >
        <circle
          cx={marginWidth / 10 + 37.5}
          cy={wrapperHeight / 2 + 10}
          r={7.5}
          strokeWidth={0}
          fill="transparent"
        />
        <BottomIcon
          x={marginWidth / 10 + 30}
          y={wrapperHeight / 2 + 2}
          height={15}
          width={15}
          fill={canMoveBottom ? "#000000" : "#cccccc"}
        />
      </g>
    </g>
  );
}
