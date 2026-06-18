import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const PADDING_X = 6;
const PADDING_Y = 4;

export function TrackTooltip({ children }: { children: ReactNode }) {
  const contentRef = useRef<SVGGElement>(null);
  const [box, setBox] = useState({ x: 0, y: -14, width: 0, height: 18 });

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const nextBox = contentRef.current.getBBox();
    setBox({ x: nextBox.x, y: nextBox.y, width: nextBox.width, height: nextBox.height });
  }, [children]);

  return (
    <g filter="drop-shadow(0 0 2px #999999)">
      <rect
        x={box.x - PADDING_X}
        y={box.y - PADDING_Y}
        width={box.width + PADDING_X * 2}
        height={box.height + PADDING_Y * 2}
        rx={2}
        fill="#ffffff"
        stroke="#cccccc"
      />
      <g ref={contentRef}>{children}</g>
    </g>
  );
}
