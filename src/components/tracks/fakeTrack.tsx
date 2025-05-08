import { useBrowserStore } from "../../store/browserStore";

export default function FakeTrack({ id, height, data, color }: { id: string, height: number, data: string, color: string }) {
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  return (
    <g id={`data-track-${id}`}>
      <rect x={0} y={0} width={trackWidth} height={height} fill={color} />
      <text x={trackWidth / 2} y={10} fontSize={10} fill="black" textAnchor="middle">
        {data}
      </text>
    </g>
  );
}
