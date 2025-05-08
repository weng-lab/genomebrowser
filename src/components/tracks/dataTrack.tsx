import { useBrowserStore } from "../../store/browserStore";
import { Track } from "../../store/tracksStore";

export default function DataTrack({ track }: { track: Track }) {
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  return (
    <g id={`data-track-${track.id}`}>
      <rect x={0} y={0} width={trackWidth} height={track.height} fill={track.color} />
      <text x={trackWidth / 2} y={10} fontSize={10} fill="black" textAnchor="middle">
        {track.data}
      </text>
    </g>
  );
}
