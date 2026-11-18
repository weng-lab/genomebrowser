import type { KeyboardEvent, ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTheme } from "@mui/material/styles";
import {
  useGenomeBrowser,
  useSettingsStore,
  useTrackMutationGate,
} from "../state/browserContextState";
import { getTrackSet, getToggledTrackPins } from "../state/trackSets";
import { getTrackSetMovement } from "../state/trackPlacement";
import type { TrackStore } from "../state/trackStore";
import { useTrackDrag } from "./reorder/trackDragContext";
import { SettingsIcon } from "./frame/icons";
import {
  TRACK_SET_HEADER_HEIGHT,
  TRACK_SET_TITLE_X,
  TRACK_SET_TOGGLE_WIDTH,
  type TrackSetLayout,
} from "./layout/trackLayout";

export function TrackSetHeader({ layout, width }: { layout: TrackSetLayout; width: number }) {
  const theme = useTheme();
  const startDrag = useTrackDrag();
  const { useTrackStore } = useGenomeBrowser();
  const { isInteractionBlocked: busy, runTrackMutation } = useTrackMutationGate();
  const trackSet = useTrackStore((state) => getTrackSet(layout.id, state.trackSets));
  const [pinned, canMoveUp, canMoveDown] = useTrackStore(
    useShallow((state) => getHeaderMovement(state, layout.id, busy)),
  );
  const updateTrackSet = useTrackStore((state) => state.updateTrackSet);
  const moveTrackSet = useTrackStore((state) => state.moveTrackSet);
  const setPinnedTrackIds = useTrackStore((state) => state.setPinnedTrackIds);
  const open = useSettingsStore((state) => state.openTrackSetSettings);

  if (!trackSet) return null;

  const toggle = () => updateTrackSet(trackSet.id, { visible: !trackSet.visible });
  const keyboard = (event: KeyboardEvent<SVGGElement>, action: () => void) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  };
  const togglePin = () =>
    runTrackMutation(() =>
      setPinnedTrackIds(getToggledTrackPins(useTrackStore.getState(), trackSet.trackIds)),
    );
  const controlsX = Math.max(TRACK_SET_TOGGLE_WIDTH, width - 132);

  return (
    <g
      data-track-set-id={trackSet.id}
      transform={`translate(0,${layout.y})`}
      style={{ color: theme.palette.text.primary, fontFamily: theme.typography.fontFamily }}
    >
      <rect
        width={width}
        height={TRACK_SET_HEADER_HEIGHT}
        fill={theme.palette.background.paper}
        stroke={theme.palette.divider}
        strokeWidth={0.5}
      />
      <g
        role="button"
        tabIndex={0}
        aria-label={`${trackSet.visible ? "Hide" : "Show"} track set ${trackSet.title}`}
        aria-expanded={trackSet.visible}
        onClick={toggle}
        onKeyDown={(event) => keyboard(event, toggle)}
        style={{ cursor: "pointer" }}
      >
        <title>{`${trackSet.visible ? "Hide" : "Show"} track set ${trackSet.title}`}</title>
        <rect width={TRACK_SET_TOGGLE_WIDTH} height={TRACK_SET_HEADER_HEIGHT} fill="transparent" />
        <path
          d={trackSet.visible ? "M 10 12 L 16 18 L 22 12" : "M 12 10 L 18 16 L 12 22"}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        />
      </g>
      <g
        data-track-set-drag-handle={trackSet.id}
        onPointerDown={(event) => startDrag({ kind: "set", id: trackSet.id }, event)}
        style={{ cursor: busy || pinned ? "default" : "grab", touchAction: "none" }}
      >
        <title>{trackSet.title}</title>
        <rect
          x={TRACK_SET_TOGGLE_WIDTH}
          width={Math.max(0, controlsX - TRACK_SET_TOGGLE_WIDTH)}
          height={TRACK_SET_HEADER_HEIGHT}
          fill="transparent"
        />
        <svg
          x={TRACK_SET_TITLE_X}
          width={Math.max(0, controlsX - TRACK_SET_TITLE_X - 4)}
          height={TRACK_SET_HEADER_HEIGHT}
          overflow="hidden"
          style={{ pointerEvents: "none" }}
        >
          <text
            y={21}
            fontSize={theme.typography.body2.fontSize}
            fontWeight={theme.typography.fontWeightMedium}
            fill="currentColor"
          >
            {trackSet.title}
          </text>
        </svg>
      </g>
      <HeaderAction
        x={controlsX}
        label={`Move track set ${trackSet.title} up`}
        disabled={!canMoveUp}
        action={() => runTrackMutation(() => moveTrackSet(trackSet.id, "up"))}
      >
        <svg
          x={7}
          y={7}
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 19V5m-6 6 6-6 6 6" />
        </svg>
      </HeaderAction>
      <HeaderAction
        x={controlsX + 32}
        label={`Move track set ${trackSet.title} down`}
        disabled={!canMoveDown}
        action={() => runTrackMutation(() => moveTrackSet(trackSet.id, "down"))}
      >
        <svg
          x={7}
          y={7}
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14m-6-6 6 6 6-6" />
        </svg>
      </HeaderAction>
      <HeaderAction
        x={controlsX + 64}
        label={`${pinned ? "Unpin" : "Pin"} track set ${trackSet.title}`}
        disabled={busy}
        pressed={pinned}
        action={togglePin}
      >
        <svg
          x={7}
          y={7}
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 3h6l-1 7 4 4v2H6v-2l4-4z" fill={pinned ? "currentColor" : "none"} />
          <path d="M12 16v5" />
        </svg>
      </HeaderAction>
      <HeaderAction
        x={controlsX + 96}
        label={`Settings for track set ${trackSet.title}`}
        action={(element) => {
          const bounds = element.getBoundingClientRect();
          open(trackSet.id, { x: bounds.left, y: bounds.top });
        }}
      >
        <SettingsIcon x={8} y={8} height={16} width={16} fill="currentColor" aria-hidden="true" />
      </HeaderAction>
      <rect
        data-track-set-outline={trackSet.id}
        x={0.5}
        y={0.5}
        width={Math.max(0, width - 1)}
        height={Math.max(0, layout.height - 1)}
        rx={theme.shape.borderRadius}
        fill="none"
        stroke={theme.palette.divider}
        strokeWidth={1}
        pointerEvents="none"
        aria-hidden="true"
      />
    </g>
  );
}

function HeaderAction({
  x,
  label,
  disabled = false,
  pressed,
  action,
  children,
}: {
  x: number;
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  action: (element: SVGGElement) => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <g
      transform={`translate(${x},0)`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      aria-pressed={pressed}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) action(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) action(event.currentTarget);
      }}
      style={{
        cursor: disabled ? "default" : "pointer",
        color: disabled ? theme.palette.action.disabled : theme.palette.text.primary,
      }}
    >
      <title>{label}</title>
      <rect
        width={32}
        height={TRACK_SET_HEADER_HEIGHT}
        rx={theme.shape.borderRadius}
        fill={pressed ? theme.palette.action.selected : "transparent"}
      />
      {children}
    </g>
  );
}

function getHeaderMovement(state: TrackStore, trackSetId: string, busy: boolean) {
  const movement = getTrackSetMovement(state, trackSetId);
  return [
    movement?.pinned ?? false,
    !busy && !!movement?.canMoveUp,
    !busy && !!movement?.canMoveDown,
  ] as const;
}
