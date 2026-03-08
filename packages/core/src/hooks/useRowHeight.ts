import { useEffect } from "react";
import { useTrackStore } from "../store/BrowserContext";

export function useRowHeight(rowCount: number, id: string, rowHeight: number = 12) {
  const editTrack = useTrackStore((state) => state.editTrack);

  useEffect(() => {
    const newHeight = Math.max(rowHeight * rowCount, 30);
    editTrack(id, { height: newHeight });
  }, [rowHeight, id, editTrack, rowCount]);

  return rowHeight;
}
