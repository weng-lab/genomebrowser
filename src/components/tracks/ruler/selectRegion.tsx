"use client";
import { useEffect, useState } from "react";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";
import { createPortal } from "react-dom";
import { RULER_HEIGHT } from "./ruler";
export default function SelectRegion() {
  const browserWidth = useBrowserStore((state) => state.browserWidth);
  const margin = useBrowserStore((state) => state.marginWidth);
  const dragRegionHeight = RULER_HEIGHT;
  const totalHeight = useTrackStore((state) => state.getTotalHeight()) + RULER_HEIGHT;
  const [region, setRegion] = useState<number[]>([0, 0]);
  const [selecting, setSelecting] = useState(false);
  const browserRef = useBrowserStore((state) => state.svgRef);
  const domain = useBrowserStore((state) => state.domain);
  const setDomain = useBrowserStore((state) => state.setDomain);
  // const setFetching = useDataStore((state) => state.setFetching);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!browserRef || !browserRef.current) return null;

    const point = transformPoint(event, browserRef.current!);
    if (!point) return;
    setRegion([point.x, point.x]);
    setSelecting(true);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!browserRef || !browserRef.current) return null;

    if (!selecting) return;
    const point = transformPoint(event, browserRef.current!);
    if (!point) return;
    const currentPosition = Math.max(margin, Math.min(browserWidth, point.x));
    setRegion((prevRegion) => {
      const start = prevRegion[0];
      const end = currentPosition;
      return [start, end];
    });
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (!browserRef || !browserRef.current) return null;

    if (!selecting) return;
    setSelecting(false);
    const start = Math.min(region[0], region[1]);
    const end = Math.max(region[0], region[1]);
    if (end - start < 10) return;
    event.preventDefault();
    const domainWidth = domain.end - domain.start;
    const area = browserWidth - margin;
    const startScale = (start - margin) / area;
    const endScale = (end - margin) / area;
    const newStart = domain.start + startScale * domainWidth;
    const newEnd = domain.start + endScale * domainWidth;
    const newDomain = { chromosome: domain.chromosome, start: Math.round(newStart), end: Math.round(newEnd) };
    setRegion([0, 0]);
    setDomain(newDomain);
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!browserRef || !browserRef.current) return null;
  return (
    <>
      {selecting
        ? createPortal(
            <rect
              id="selectRegion"
              fill="#6666aaaa"
              stroke="#000000"
              strokeWidth={0.5}
              strokeDasharray="5 5"
              x={Math.min(region[0], region[1])}
              y={0}
              width={Math.abs(region[1] - region[0])}
              height={totalHeight}
            />,
            browserRef!.current!
          )
        : null}
      <rect
        fill="#ffaaff"
        width={browserWidth - margin}
        height={dragRegionHeight}
        x={margin}
        y={0}
        onMouseDown={handleMouseDown}
      ></rect>
    </>
  );
}

function transformPoint(event: MouseEvent | React.MouseEvent, element: SVGSVGElement) {
  const pt = element.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const CTM = element.getScreenCTM();
  if (!CTM) return null;
  return pt.matrixTransform(CTM.inverse());
}
