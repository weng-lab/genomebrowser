import { useLayoutEffect, useRef, useState } from "react";

export function DefaultTooltip({ value }: { value: string }) {
  const textRef = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!textRef.current) return;
    setWidth(textRef.current.getBBox().width);
  }, [value]);

  return (
    <g filter="drop-shadow(0 0 2px #999999)">
      <rect x={0} y={-16} width={width + 10} height={22} rx={2} fill="#ffffff" stroke="#cccccc" />
      <text ref={textRef} x={5} y={0} fill="#000000" fontSize={12} dominantBaseline="middle">
        {value}
      </text>
    </g>
  );
}
