import { findTrackSet } from "../../state/trackSets";
import { useRef } from "react";
import type { AnyTrackInstance } from "../../../modules/types";
import {
  useSettingsStore,
  useTrackMutationGate,
  useGenomeBrowser,
} from "../../state/browserContextState";
import { BottomIcon, SettingsIcon, TopIcon } from "./icons";

export function TrackControls({
  track,
  marginWidth,
  wrapperHeight,
}: {
  track: AnyTrackInstance;
  marginWidth: number;
  wrapperHeight: number;
}) {
  const { useTrackStore } = useGenomeBrowser();
  const settingsButtonRef = useRef<SVGGElement>(null);
  const openSettings = useSettingsStore((state) => state.openSettings);
  const order = useTrackStore((state) => state.order);
  const pinnedTrackIds = useTrackStore((state) => state.pinnedTrackIds);
  const moveTrackItem = useTrackStore((state) => state.moveTrackItem);
  const group = useTrackStore((state) => findTrackSet(track.base.id, state.trackSets));
  const { isInteractionBlocked, runTrackMutation } = useTrackMutationGate();
  const trackId = track.base.id;
  const index = order.indexOf(trackId);
  const pinned = new Set(pinnedTrackIds);
  const members = group ? new Set(group.trackIds) : undefined;
  const scope = order.filter((id) => (members ? members.has(id) : !pinned.has(id)));
  const canMove =
    !isInteractionBlocked && !pinned.has(trackId) && !group?.trackIds.some((id) => pinned.has(id));
  const canMoveTop = canMove && index >= 0 && trackId !== scope[0];
  const canMoveBottom = canMove && index >= 0 && trackId !== scope.at(-1);
  const controlsCenterY = wrapperHeight / 2;
  const iconY = controlsCenterY - 7.5;

  const moveTrack = (target: "top" | "bottom") => {
    runTrackMutation(() =>
      moveTrackItem(
        { kind: "track", id: trackId },
        { trackSetId: group?.id, beforeTrackId: target === "top" ? scope[0] : undefined },
      ),
    );
  };

  const handleOpenSettings = (event: React.MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    const rect = settingsButtonRef.current?.getBoundingClientRect();
    openSettings(trackId, rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 });
  };

  return (
    <g>
      <g
        role="button"
        aria-label={`Settings for ${track.base.title}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openSettings(trackId, { x: 0, y: 0 });
          }
        }}
        ref={settingsButtonRef}
        onClick={handleOpenSettings}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ cursor: "pointer" }}
      >
        <circle
          cx={marginWidth / 10 + 7.5}
          cy={controlsCenterY}
          r={7.5}
          strokeWidth={0}
          fill="transparent"
        />
        <SettingsIcon x={marginWidth / 10} y={iconY} height={15} width={15} fill="#000000" />
      </g>
      <g
        onClick={canMoveTop ? () => moveTrack("top") : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ cursor: canMoveTop ? "pointer" : "default" }}
      >
        <circle
          cx={marginWidth / 10 + 22.5}
          cy={controlsCenterY}
          r={7.5}
          strokeWidth={0}
          fill="transparent"
        />
        <TopIcon
          x={marginWidth / 10 + 15}
          y={iconY}
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
          cy={controlsCenterY}
          r={7.5}
          strokeWidth={0}
          fill="transparent"
        />
        <BottomIcon
          x={marginWidth / 10 + 30}
          y={iconY}
          height={15}
          width={15}
          fill={canMoveBottom ? "#000000" : "#cccccc"}
        />
      </g>
    </g>
  );
}
