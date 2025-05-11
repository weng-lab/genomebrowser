import { ApolloError } from "@apollo/client";
import { useEffect, useState } from "react";
import { useDataStore } from "../../store/dataStore";
import { DisplayMode, Track, TrackType, useTrackStore } from "../../store/trackStore";
import Wrapper from "../wrapper/wrapper";
import FullBigWig from "./bigwig/full";

export default function DisplayTrack({ id }: { id: string }) {
  const data = useDataStore((state) => state.data.get(id));

  const [error, setError] = useState<ApolloError | undefined>(undefined);
  const loading = useDataStore((state) => state.loading);

  useEffect(() => {
    if (loading || !data) return;
    setError(data.error);
  }, [loading, data]);

  const track = useTrackStore((state) => state.getTrack(id));
  const prevHeights = useTrackStore((state) => state.getPrevHeights(id));
  const transform = `translate(0, ${prevHeights})`;
  return (
    <Wrapper id={id} transform={transform} error={error?.message} loading={loading}>
      {track && data ? getTrackComponent(track, data) : <></>}
    </Wrapper>
  );
}

const trackComponents = {
  [TrackType.BigWig]: {
    [DisplayMode.Full]: FullBigWig,
  },
  [TrackType.BigBed]: {
    [DisplayMode.Full]: FullBigWig,
  },
  [TrackType.Transcript]: {
    [DisplayMode.Full]: FullBigWig,
  },
};

function getTrackComponent(track: Track, data: any) {
  const Component = trackComponents[track.trackType][track.displayMode];
  if (!Component) return null;
  return <Component {...track} data={data.data.data} />;
}
