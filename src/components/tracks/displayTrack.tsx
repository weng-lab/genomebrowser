import { ApolloError } from "@apollo/client";
import { useEffect, useState } from "react";
import { useDataStore } from "../../store/dataStore";
import { DisplayMode, Track, TrackType, useTrackStore } from "../../store/trackStore";
import Wrapper from "../wrapper/wrapper";
import FullBigWig from "./bigwig/full";

export default function DisplayTrack({ id }: { id: string }) {
  const getTrack = useTrackStore((state) => state.getTrack);
  const getPrevHeights = useTrackStore((state) => state.getPrevHeights);
  const getData = useDataStore((state) => state.getData);

  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<ApolloError | undefined>(undefined);
  const loading = useDataStore((state) => state.loading);

  const trackData = getData(id);
  const prevHeights = getPrevHeights(id);

  useEffect(() => {
    if (loading || !trackData) return;
    setData(trackData.data.data);
    setError(trackData.error);
  }, [loading, trackData]);

  const transform = `translate(0, ${prevHeights})`;

  const track = getTrack(id);

  return (
    <Wrapper id={id} transform={transform} error={error?.message} loading={loading}>
      {track && data ? getTrackComponent(track, data) : <></>}
    </Wrapper>
  );
}

function getTrackComponent(track: Track, data: any) {
  switch (track.trackType) {
    case TrackType.BigWig:
      if (track.displayMode === DisplayMode.Full) {
        return (
          <FullBigWig
            trackType={track.trackType}
            displayMode={track.displayMode}
            id={track.id}
            data={data}
            range={track.range}
            height={track.height}
            color={track.color}
          />
        );
      } else {
        return <></>;
      }
    default:
      return <></>;
  }
}
