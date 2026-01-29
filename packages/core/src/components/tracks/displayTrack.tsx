import { useMemo } from "react";
import { useBrowserStore, useDataStore, useTrackStore } from "../../store/BrowserContext";
import { usePrevHeights } from "../../hooks/useTrackLayout";
import { Track } from "../../store/trackStore";
import DenseBigBed from "./bigbed/dense";
import DenseBigWig from "./bigwig/dense";
import { DisplayMode, TrackDimensions, TrackType } from "./types";
import Wrapper from "./wrapper/wrapper";
import SquishBigBed from "./bigbed/squish";
import SquishTranscript from "./transcript/squish";
import PackTranscript from "./transcript/pack";
import { RULER_HEIGHT } from "./ruler/ruler";
import Importance from "./importance/importance";
import DenseMotif from "./motif/dense";
import SquishMotif from "./motif/squish";
import BulkBed from "./bulkbed/bulkbed";
import SplitMethylC from "./methylC/split";
import ReworkBigWig from "./bigwig/rework";
import LD from "./ldtrack/ldblock";
import Scatter from "./manhattan/scatter";
import GenericLD from "./ldtrack/genericld";

export default function DisplayTrack({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id));
  const trackDataState = useDataStore((state) => state.trackData.get(id));
  const getTrackDimensions = useBrowserStore((state) => state.getTrackDimensions);
  const trackDimensions = getTrackDimensions();

  // Infer loading and error state from trackDataState
  const isLoading = !trackDataState || (trackDataState.data === null && trackDataState.error === null);
  const error = trackDataState?.error ?? undefined;
  const data = trackDataState?.data ?? undefined;

  // Stack track
  const prevHeights = usePrevHeights(id);
  const transform = useMemo(() => `translate(0, ${prevHeights + RULER_HEIGHT})`, [prevHeights]);

  // Track component
  const trackComponent = useMemo(
    () => (track && data ? getTrackComponent(track, data, trackDimensions) : <></>),
    [track, data, trackDimensions]
  );
  return (
    <Wrapper id={id} transform={transform} error={error} loading={isLoading}>
      {trackComponent}
    </Wrapper>
  );
}

export const trackComponents: Record<TrackType, Partial<Record<DisplayMode, React.ComponentType<any>>>> = {
  [TrackType.BigWig]: {
    [DisplayMode.Full]: ReworkBigWig,
    [DisplayMode.Dense]: DenseBigWig,
  },
  [TrackType.BigBed]: {
    [DisplayMode.Dense]: DenseBigBed,
    [DisplayMode.Squish]: SquishBigBed,
  },
  [TrackType.Transcript]: {
    [DisplayMode.Squish]: SquishTranscript,
    [DisplayMode.Pack]: PackTranscript,
  },
  [TrackType.Motif]: {
    [DisplayMode.Dense]: DenseMotif,
    [DisplayMode.Squish]: SquishMotif,
  },
  [TrackType.Importance]: {
    [DisplayMode.Full]: Importance,
  },
  [TrackType.LDTrack]: {
    [DisplayMode.LDBlock]: LD,
    [DisplayMode.GenericLD]: GenericLD,
  },
  [TrackType.BulkBed]: {
    [DisplayMode.Full]: BulkBed,
  },
  [TrackType.MethylC]: {
    // [DisplayMode.Combined]: CombinedMethylC,
    [DisplayMode.Split]: SplitMethylC,
  },
  [TrackType.Manhattan]: {
    [DisplayMode.Scatter]: Scatter,
  },
};

function getTrackComponent(track: Track, data: any, dimensions: TrackDimensions) {
  const Component = trackComponents[track.trackType][track.displayMode];
  if (!Component) return null;

  // Special handling for BulkBed tracks to include datasets information
  if (track.trackType === "bulkbed") {
    const bulkBedTrack = track as any; // Type assertion for BulkBedConfig
    const datasets =
      bulkBedTrack.datasets ||
      (bulkBedTrack.urls || []).map((url: string, i: number) => ({
        name: `Dataset ${i + 1}`,
        url,
      }));
    return <Component {...track} data={data} dimensions={dimensions} datasets={datasets} />;
  }

  return <Component {...track} data={data} dimensions={dimensions} />;
}
