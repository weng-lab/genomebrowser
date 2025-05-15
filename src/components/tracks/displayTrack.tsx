import { ApolloError } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { useBrowserStore } from "../../store/browserStore";
import { useDataStore } from "../../store/dataStore";
import { Track, useTrackStore } from "../../store/trackStore";
import DenseBigBed from "./bigbed/dense";
import DenseBigWig from "./bigwig/dense";
import FullBigWig from "./bigwig/full";
import { DisplayMode, TrackDimensions, TrackType } from "./types";
import Wrapper from "./wrapper/wrapper";
import SquishBigBed from "./bigbed/squish";
import SquishTranscript from "./transcript/squish";

export default function DisplayTrack({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id));
  const data = useDataStore((state) => state.data.get(id));
  const [error, setError] = useState<ApolloError | undefined>(undefined);
  const loading = useDataStore((state) => state.loading);

  // Dimensions
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const multiplier = useBrowserStore((state) => state.multiplier);
  const sidePortion = (multiplier - 1) / 2;
  const trackDimensions: TrackDimensions = {
    totalWidth: trackWidth * multiplier,
    viewWidth: trackWidth,
    sideWidth: sidePortion * trackWidth,
    sidePortion,
    multiplier,
  };

  // Error handling
  useEffect(() => {
    if (loading || !data) return;
    setError(data.error);
  }, [loading, data]);

  // Stack track
  const prevHeights = useTrackStore((state) => state.getPrevHeights(id));
  const transform = useMemo(() => `translate(0, ${prevHeights})`, [prevHeights]);

  // Track component
  const trackComponent = useMemo(
    () => (track && data ? getTrackComponent(track, data, trackDimensions) : <></>),
    [track, data, trackDimensions]
  );

  return (
    <Wrapper id={id} transform={transform} error={error?.message} loading={loading}>
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
  },
  [TrackType.Motif]: {
    [DisplayMode.Full]: () => <></>,
  },
  [TrackType.Importance]: {
    [DisplayMode.Full]: () => <></>,
  },
  [TrackType.LDTrack]: {
    [DisplayMode.Full]: () => <></>,
  },
};

function getTrackComponent(track: Track, data: any, dimensions: TrackDimensions) {
  if (track.trackType === TrackType.Transcript) {
    console.log(data);
  }
  const Component = trackComponents[track.trackType][track.displayMode];
  if (!Component) return null;
  return <Component {...track} data={data.data} dimensions={dimensions} />;
}
