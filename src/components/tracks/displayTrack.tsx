import { ApolloError } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { useBrowserStore, useDataStore, useTrackStore } from "../../store/BrowserContext";
import { Track } from "../../store/trackStore";
import DenseBigBed from "./bigbed/dense";
import DenseBigWig from "./bigwig/dense";
import FullBigWig from "./bigwig/full";
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
import MethylC from "./methylC/methylc";

export default function DisplayTrack({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id));
  const data = useDataStore((state) => state.data.get(id));
  const [error, setError] = useState<ApolloError | undefined>(undefined);
  const loading = useDataStore((state) => state.loading);
  const getTrackDimensions = useBrowserStore((state) => state.getTrackDimensions);
  const trackDimensions = getTrackDimensions();

  // Error handling
  useEffect(() => {
    if (loading || !data) return;
    setError(data.error);
  }, [loading, data]);

  // Stack track
  const prevHeights = useTrackStore((state) => state.getPrevHeights(id));
  const transform = useMemo(() => `translate(0, ${prevHeights + RULER_HEIGHT})`, [prevHeights]);

  // Track component
  const trackComponent = useMemo(
    () => (track && data ? getTrackComponent(track, data, trackDimensions) : <></>),
    [track, data, trackDimensions]
  );

  return (
    <Wrapper id={id} transform={transform} error={error?.message} loading={!data?.data}>
      {trackComponent}
    </Wrapper>
  );
}

export const trackComponents: Record<TrackType, Partial<Record<DisplayMode, React.ComponentType<any>>>> = {
  [TrackType.BigWig]: {
    [DisplayMode.Full]: FullBigWig,
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
    [DisplayMode.Full]: () => <></>,
  },
  [TrackType.BulkBed]: {
    [DisplayMode.Full]: BulkBed,
  },
  [TrackType.MethylC]: {
    [DisplayMode.Combined]: MethylC,
    [DisplayMode.Split]: MethylC,
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
    return <Component {...track} data={data.data} dimensions={dimensions} datasets={datasets} />;
  }

  return <Component {...track} data={data.data} dimensions={dimensions} />;
}
