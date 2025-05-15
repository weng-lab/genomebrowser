import { ApolloError } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { useDataStore } from "../../store/dataStore";
import { DisplayMode, Track, TrackType, useTrackStore } from "../../store/trackStore";
import Wrapper from "./wrapper/wrapper";
import FullBigWig from "./bigwig/full";
import DenseBigWig from "./bigwig/dense";
import { TrackDimensions } from "./types";
import { useBrowserStore } from "../../store/browserStore";

export default function DisplayTrack({ id }: { id: string }) {
  const data = useDataStore((state) => state.data.get(id));
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

  const [error, setError] = useState<ApolloError | undefined>(undefined);
  const loading = useDataStore((state) => state.loading);

  useEffect(() => {
    if (loading || !data) return;
    setError(data.error);
  }, [loading, data]);

  const track = useTrackStore((state) => state.getTrack(id));
  const prevHeights = useTrackStore((state) => state.getPrevHeights(id));
  const transform = useMemo(() => `translate(0, ${prevHeights})`, [prevHeights]);
  const trackComponent = useMemo(() => (track && data ? getTrackComponent(track, data, trackDimensions) : <></>), [track, data, trackDimensions]);
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
    [DisplayMode.Full]: FullBigWig,
  },
  [TrackType.Transcript]: {
    [DisplayMode.Full]: FullBigWig,
  },
  [TrackType.Motif]: {
    [DisplayMode.Full]: FullBigWig,
  },
  [TrackType.Importance]: {
    [DisplayMode.Full]: FullBigWig,
  },
  [TrackType.LDTrack]: {
    [DisplayMode.Full]: FullBigWig,
  },
};

function getTrackComponent(track: Track, data: any, dimensions: TrackDimensions) {
  const Component = trackComponents[track.trackType][track.displayMode];
  if (!Component) return null;
  return <Component {...track} data={data.data} dimensions={dimensions} />;
}
