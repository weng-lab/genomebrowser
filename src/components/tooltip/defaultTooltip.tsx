import { useEffect } from "react";
import { useTheme } from "../../store/themeStore";
import { useRef, useState } from "react";

export default function DefaultTooltip({ value }: { value: string }) {
  const textRef = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState(0);
  const { text, background } = useTheme();

  useEffect(() => {
    if (textRef.current) {
      const width = textRef.current.getBBox().width;
      setWidth(width);
    }
  }, [value, textRef.current, setWidth]);

  return (
    <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
      <rect rx={2} y={-15} width={width + 10} height={20} fill={background} />
      <text ref={textRef} x={5} y={0} fill={text}>
        {value}
      </text>
    </g>
  );
}
