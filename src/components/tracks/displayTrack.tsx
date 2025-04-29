import { useTrackStore } from "../../store/tracksStore";
import Wrapper from "../wrapper/wrapper";
import DataTrack from "./dataTrack";

export default function DisplayTrack({ index }: { index: number }) {
  const track = useTrackStore((state) => state.getTrackbyIndex(index));
  if (!track) return null;
  const prevHeights = useTrackStore((state) => state.getPrevHeights(track.id));
  const transform = `translate(0, ${prevHeights})`;

  return (
    <Wrapper height={track.height} color={track.color} transform={transform} id={track.id}>
      <DataTrack track={track} />
    </Wrapper>
  );
}