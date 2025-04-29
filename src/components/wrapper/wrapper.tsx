import { useEffect, useState } from "react";
import DragTrack from "./dragTrack";
import Margin from "./margin";
import SwapTrack from "./swapTrack";
import { useTrackStore } from "../../store/tracksStore";

export default function Wrapper({
  children,
  height,
  transform,
  color,
  id,
}: {
  children: React.ReactNode;
  height: number;
  transform: string;
  color: string;
  id: string;
}) {
  const [swapping, setSwapping] = useState(false);
  const [hover, setHover] = useState(false);
  const track = useTrackStore((state) => state.getTrack(id));
  const onHover = () => {
    setHover(true);
  };
  const onLeave = () => {
    setHover(false);
  };

  useEffect(() => {
    if (!swapping) {
      setHover(false);
    }
  }, [swapping]);

  return (
    <g id={`wrapper-${id}`} transform={transform}>
      <SwapTrack id={id} setSwapping={setSwapping}>
        <DragTrack id={id}>{children}</DragTrack>
        <Margin id={id} height={height} color={color} swapping={swapping} onHover={onHover} onLeave={onLeave} />
        {hover && (
          <rect
            width={1500}
            height={height}
            fill={track?.alt || "transparent"}
            fillOpacity={0.45}
            style={{ pointerEvents: "none" }}
          />
        )}
      </SwapTrack>
    </g>
  );
}
