import { TrackType, useTrackStore } from "../../store/tracksStore";
import Wrapper from "../wrapper/wrapper";
import FullBigWig from "./bigwig/full";
import { ValuedPoint } from "./bigwig/types";

const useTrackData = (_: string) => {
  const TEST_DATA: ValuedPoint[] = (() => {
    const results: ValuedPoint[] = [];
    for (let i = 0; i < 1350; ++i) {
      results.push({
        x: i,
        max: Math.sin((i * 2.0 * Math.PI) / 100.0),
        min: Math.sin((i * 2.0 * Math.PI) / 100.0),
      });
    }
    return results;
  })();
  return { data: TEST_DATA, error: "", loading: false };
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
      {track.trackType === TrackType.BigWig && (
        <FullBigWig id={track.id} data={data} range={track.range} height={track.height} color={track.color} />
      )}
    </Wrapper>
  );
}
