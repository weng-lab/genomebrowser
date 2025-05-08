import { useEffect, useState } from "react";
import { useTrackStore } from "../../store/tracksStore";
import Wrapper from "../wrapper/wrapper";
import DataTrack from "./dataTrack";

export default function DisplayTrack({ index }: { index: number }) {
  const track = useTrackStore((state) => state.getTrackbyIndex(index));
  if (!track) return null;

  const [loading, setLoading] = useState(track.data !== "LOADING" ? false : true);
  useEffect(() => {
    if (track.data !== "LOADING") {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [track.data]);

  if (!track) return null;
  const prevHeights = useTrackStore((state) => state.getPrevHeights(track.id));
  const transform = `translate(0, ${prevHeights})`;

  return (
    <Wrapper
      id={track.id}
      transform={transform}
      color={track.color}
      title={track.title}
      shortLabel={track.title}
      loading={loading}
      error={""}
    >
      <DataTrack track={track} />
    </Wrapper>
  );
}
