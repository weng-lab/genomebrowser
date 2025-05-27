import { useEffect, useRef, useState } from "react";
import { useBrowserStore } from "../../store/browserStore";
import { useTooltipStore } from "../../store/tooltipStore";
import { svgPoint } from "../../utils/svg";

export default function Tooltip() {
  const { content, x, y, show } = useTooltipStore();
  const [newX, setNewX] = useState(0);
  const [newY, setNewY] = useState(0);
  const browserRef = useBrowserStore((state) => state.svgRef);
  const ref = useRef<SVGGElement>(null);
  const delta = useBrowserStore((state) => state.delta);
  const trackWidth = useBrowserStore((state) => state.browserWidth);
  const offset = 15;

  useEffect(() => {
    if (!ref.current || !browserRef || !browserRef.current) return;
    const pos = svgPoint(browserRef.current, x, y);
    const tempX = pos[0];
    const tempY = pos[1];
    const width = ref.current.getBoundingClientRect().width;
    const newX = tempX > trackWidth - width - offset ? tempX - width - offset : tempX + offset;
    const newY = tempY;
    setNewX(newX);
    setNewY(newY);
  }, [show, content, x, y, trackWidth, browserRef]);

  if (!show || delta) return null;
  return (
    <g ref={ref} id="tooltip" transform={`translate(${newX}, ${newY})`}>
      {content}
    </g>
  );
}
