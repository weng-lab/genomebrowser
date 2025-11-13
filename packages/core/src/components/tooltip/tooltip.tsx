import { useCallback, useEffect, useRef, useState } from "react";
import { useBrowserStore, useTooltipStore, useTrackStore } from "../../store/BrowserContext";
import { svgPoint } from "../../utils/svg";
import { RULER_HEIGHT } from "../tracks/ruler/ruler";

export default function Tooltip() {
  const content = useTooltipStore((state) => state.content);
  const x = useTooltipStore((state) => state.x);
  const y = useTooltipStore((state) => state.y);
  const show = useTooltipStore((state) => state.show);
  const [newX, setNewX] = useState(0);
  const [newY, setNewY] = useState(0);
  const [tooltipDimensions, setTooltipDimensions] = useState({ width: 0, height: 0 });
  const browserRef = useBrowserStore((state) => state.svgRef);
  const ref = useRef<SVGGElement>(null);
  const delta = useBrowserStore((state) => state.delta);
  const trackWidth = useBrowserStore((state) => state.browserWidth);
  const totalHeight = useTrackStore((state) => state.getTotalHeight());
  const svgHeight = totalHeight + RULER_HEIGHT;
  const offset = 5;

  const calculatePosition = useCallback(() => {
    if (!ref.current || !browserRef || !browserRef.current) return;

    const pos = svgPoint(browserRef.current, x, y);
    const mouseX = pos[0];
    const mouseY = pos[1];

    const bbox = ref.current.getBBox();
    const tooltipWidth = bbox.width;
    const tooltipHeight = bbox.height;

    if (tooltipDimensions.width !== tooltipWidth || tooltipDimensions.height !== tooltipHeight) {
      setTooltipDimensions({ width: tooltipWidth, height: tooltipHeight });
    }

    let newX = mouseX + offset;
    let newY = mouseY + offset;

    if (newX + tooltipWidth > trackWidth) {
      newX = mouseX - tooltipWidth - offset;
    }

    if (newX < 0) {
      newX = Math.max(0, trackWidth - tooltipWidth);
    }

    if (newY + tooltipHeight > svgHeight) {
      newY = mouseY - tooltipHeight - offset;
    }

    if (newY < 0) {
      newY = Math.max(0, svgHeight - tooltipHeight);
    }

    setNewX(newX);
    setNewY(newY);
  }, [x, y, browserRef, trackWidth, svgHeight, offset, tooltipDimensions]);

  useEffect(() => {
    if (!ref.current || !browserRef || !browserRef.current || !show) return;

    requestAnimationFrame(calculatePosition);

    const observer = new MutationObserver(() => {
      requestAnimationFrame(calculatePosition);
    });

    observer.observe(ref.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [show, content, x, y, trackWidth, svgHeight, browserRef]);

  if (!show || delta) return null;
  return (
    <g ref={ref} id="tooltip" transform={`translate(${newX}, ${newY})`}>
      {content}
    </g>
  );
}
