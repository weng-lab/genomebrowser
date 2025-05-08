import { useTrackStore } from "../../store/tracksStore";
import Wrapper from "../wrapper/wrapper";
import DataTrack from "./fakeTrack";

const useTrackData = (id: string) => {
  return { data: `${id} some data`, error: "", loading: false };
};

export default function DisplayTrack({ index }: { index: number }) {
  const track = useTrackStore((state) => state.getTrackbyIndex(index));
  if (!track) return null;

  const { data, error, loading } = useTrackData(track.id);

  const prevHeights = useTrackStore((state) => state.getPrevHeights(track.id));
  const transform = `translate(0, ${prevHeights})`;

  return (
    <Wrapper id={track.id} transform={transform} error={error} loading={loading}>
      {/* switch based on track type */}
      <DataTrack id={track.id} height={track.height} data={data} color={track.color || "#aaaaaa"} />
    </Wrapper>
  );
}
