import type { ComponentType } from "react";
import type { BrowserRegion } from "../utils/region";
import type { createModuleRegistry } from "../modules/registry";
import type { TrackConfigBase, TrackDataState, TrackRendererProps } from "../modules/types";
import type { TrackStoreInstance } from "../stores/trackStore";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { SwapTrack } from "./SwapTrack";
import { getTrackTitleMargin, getTrackWrapperHeight, TrackFrame } from "./TrackFrame";
import type { PanDragHandlers } from "./usePanDrag";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export function getTracksHeight(tracks: TrackConfigBase[], titleSize: number) {
  return tracks.reduce((total, track) => total + getTrackWrapperHeight(track, titleSize), 0);
}

export function TrackStack({
  tracks,
  dataStates,
  registry,
  region,
  marginWidth,
  trackWidth,
  contentX,
  contentWidth,
  registerContentGroup,
  panDrag,
  isPanLocked,
  titleSize,
  trackStore,
  startY,
  svg,
}: {
  tracks: TrackConfigBase[];
  dataStates: Record<string, TrackDataState>;
  registry: ModuleRegistry;
  region: BrowserRegion;
  marginWidth: number;
  trackWidth: number;
  contentX?: number;
  contentWidth?: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
  panDrag?: PanDragHandlers;
  isPanLocked?: boolean;
  titleSize: number;
  trackStore: TrackStoreInstance;
  startY: number;
  svg: SVGSVGElement | null;
}) {
  let y = startY;

  return tracks.map((track) => {
    const trackY = y;
    const wrapperHeight = getTrackWrapperHeight(track, titleSize);
    const titleMargin = getTrackTitleMargin(track, titleSize);
    y += wrapperHeight;

    return (
      <SwapTrack
        key={track.id}
        track={track}
        tracks={tracks}
        trackStore={trackStore}
        titleSize={titleSize}
        svg={svg}
        disabled={isPanLocked}
      >
        <TrackFrame
          track={track}
          y={trackY}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          contentX={contentX}
          registerContentGroup={registerContentGroup}
          panDrag={panDrag}
          isPanLocked={isPanLocked}
          titleSize={titleSize}
          trackStore={trackStore}
        >
          <TrackContent
            track={track}
            dataState={dataStates[track.id] ?? { status: "idle" }}
            registry={registry}
            region={region}
            width={contentWidth ?? trackWidth}
            height={track.height}
            titleMargin={titleMargin}
          />
        </TrackFrame>
      </SwapTrack>
    );
  });
}

function TrackContent({
  track,
  dataState,
  registry,
  region,
  width,
  height,
  titleMargin,
}: {
  track: TrackConfigBase;
  dataState: TrackDataState;
  registry: ModuleRegistry;
  region: BrowserRegion;
  width: number;
  height: number;
  titleMargin: number;
}) {
  if (dataState.status === "idle" || dataState.status === "loading") {
    return <LoadingState x={0} y={0} width={width} height={height} />;
  }
  if (dataState.status === "error") {
    return (
      <ErrorState
        x={0}
        y={0}
        width={width}
        height={height + titleMargin}
        message={dataState.error}
      />
    );
  }

  try {
    const module = registry.get(track.type);
    const validatedTrack = module.validate(track);
    const Renderer = module.render[track.display] as
      | ComponentType<TrackRendererProps<TrackConfigBase, unknown>>
      | undefined;
    if (!Renderer) {
      return (
        <ErrorState
          x={0}
          y={0}
          width={width}
          height={height}
          message={`Display "${track.display}" is not supported by "${track.type}"`}
        />
      );
    }
    return (
      <Renderer
        track={validatedTrack}
        data={dataState.data}
        region={region}
        width={width}
        height={height}
      />
    );
  } catch (error) {
    return (
      <ErrorState
        x={0}
        y={0}
        width={width}
        height={height}
        message={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }
}
