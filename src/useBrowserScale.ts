import { useEffect, useState } from "react";
import { useBrowserStore } from "./browserStore";

function useBrowserScale() {
  const [scale, setScale] = useState(1);
  const svgRef = useBrowserStore((state) => state.svgRef);
  useEffect(() => {
    if (!svgRef || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setScale(rect.width / svgRef.current.viewBox.baseVal.width);
  }, [svgRef]);
  return scale;
}

export default useBrowserScale;
