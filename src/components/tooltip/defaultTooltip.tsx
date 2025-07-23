import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../store/BrowserContext";

export default function DefaultTooltip({ value }: { value: string }) {
  const textRef = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState(0);
  const text = useTheme((state) => state.text);
  const background = useTheme((state) => state.background);

  useEffect(() => {
    if (textRef.current) {
      const width = textRef.current.getBBox().width;
      setWidth(width);
    }
  }, [value, textRef, setWidth]);

  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect rx={2} y={-15} width={width + 10} height={20} fill={background} />
      <text ref={textRef} x={5} y={1} fill={text}>
        {value}
      </text>
    </g>
  );
}
