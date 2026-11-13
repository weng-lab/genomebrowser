import { useTrackSetDrag } from "./reorder/trackSetDragState";
import type { KeyboardEvent } from "react";
import { useGenomeBrowser, useSettingsStore } from "../state/browserContextState";
import { TRACK_SET_HEADER_HEIGHT, type TrackSetLayout } from "./layout/trackLayout";

export function TrackSetHeader({
  layout,
  width,
  configurable,
}: {
  layout: TrackSetLayout;
  width: number;
  configurable: boolean;
}) {
  const startDrag = useTrackSetDrag();
  const { useTrackStore, useBrowserStore } = useGenomeBrowser();
  const busy = useBrowserStore((state) => state.isLoading);
  const pinned = useTrackStore((state) => {
    const ids = new Set(state.pinnedTrackIds);
    return (
      state.trackSets.find((set) => set.id === layout.id)?.trackIds.some((id) => ids.has(id)) ??
      false
    );
  });
  const set = useTrackStore((state) => state.trackSets.find((set) => set.id === layout.id));
  const updateTrackSet = useTrackStore((state) => state.updateTrackSet);
  const open = useSettingsStore((state) => state.openTrackSetSettings);
  if (!set) return null;
  const toggle = () => updateTrackSet(set.id, { visible: !set.visible });
  const keyboard = (event: KeyboardEvent<SVGGElement>, action: () => void) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  };
  return (
    <g data-track-set-id={set.id} transform={`translate(0,${layout.y})`}>
      <rect
        width={width}
        height={TRACK_SET_HEADER_HEIGHT}
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth={0.5}
      />
      <g
        role="button"
        tabIndex={0}
        aria-label={`${set.visible ? "Hide" : "Show"} track set ${set.title}`}
        aria-expanded={set.visible}
        onClick={toggle}
        onKeyDown={(event) => keyboard(event, toggle)}
        style={{ cursor: "pointer" }}
      >
        <rect width={32} height={TRACK_SET_HEADER_HEIGHT} fill="transparent" />
        <path
          d={set.visible ? "M 10 12 L 16 18 L 22 12" : "M 12 10 L 18 16 L 12 22"}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        />
      </g>
      <g
        data-track-set-drag-handle={set.id}
        onPointerDown={(event) => startDrag({ kind: "set", id: set.id }, event)}
        style={{ cursor: busy || pinned ? "default" : "grab", touchAction: "none" }}
      >
        <rect
          x={32}
          width={Math.max(0, width - 112)}
          height={TRACK_SET_HEADER_HEIGHT}
          fill="transparent"
        />
        <text x={36} y={21} fontSize={13} fontWeight={600}>
          {set.title}
        </text>
      </g>
      {configurable && (
        <g
          role="button"
          tabIndex={0}
          aria-label={`Settings for track set ${set.title}`}
          onClick={() => open(set.id)}
          onKeyDown={(event) => keyboard(event, () => open(set.id))}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={Math.max(0, width - 80)}
            width={80}
            height={TRACK_SET_HEADER_HEIGHT}
            fill="transparent"
          />
          <text x={width - 12} y={21} textAnchor="end" fontSize={12}>
            Settings
          </text>
        </g>
      )}
    </g>
  );
}
