import { Track } from "../../store/tracksStore";

export default function DataTrack({ track }: { track: Track }) {
  return (
    <g id={`data-track-${track.id}`}>
      <rect x={0} y={0} width={1000} height={track.height} fill={track.color} />
      <text x={500} y={10} fontSize={10} fill="black">
        {track.data}
      </text>
    </g>
  );
}