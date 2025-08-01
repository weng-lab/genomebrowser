import { useCallback, useState } from "react";
import { svgPoint } from "../utils/svg";

export function useMouseToIndex(
  svgRef: React.RefObject<SVGSVGElement | null> | null,
  dataLength: number,
  marginWidth: number,
  sideWidth: number
) {
  const [mouseState, setMouseState] = useState<{
    pos: { x: number; y: number } | null;
    index: number | null;
  }>({ pos: null, index: null });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!svgRef) return;
      const result = getPosAndIndex(e, svgRef, dataLength, marginWidth);
      setMouseState(result ? { pos: result.pos, index: result.index + sideWidth } : { pos: null, index: null });
    },
    [svgRef, dataLength, marginWidth]
  );

  const handleMouseOut = useCallback(() => {
    setMouseState({ pos: null, index: null });
  }, []);

  return {
    mouseState,
    handleMouseMove,
    handleMouseOut,
  };
}

function getPosAndIndex(
  e: React.MouseEvent,
  svgRef: React.RefObject<SVGSVGElement | null>,
  dataLength: number,
  marginWidth: number
):
  | {
      pos: { x: number; y: number };
      index: number;
    }
  | undefined {
  if (!svgRef || !svgRef.current || !dataLength) return undefined;
  // Get the position of the mouse
  const pos = svgPoint(svgRef.current, e.clientX, e.clientY);
  // Calculate which data point based on mouse X position
  const adjustedX = Math.round(pos[0] - marginWidth);

  // Use direct array indexing since data.length === totalWidth
  const index = Math.max(0, Math.min(adjustedX, dataLength - 1));
  return { pos: { x: pos[0], y: pos[1] }, index };
}
