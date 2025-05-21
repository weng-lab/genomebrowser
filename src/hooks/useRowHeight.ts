import { useEffect, useMemo } from "react";
import { BigBedConfig } from "../components/tracks/bigbed/types";
import { useTrackStore } from "../store/trackStore";

export function useRowHeight(height: number, rowCount: number, id: string, minRowHeight: number = 12) {
  const editTrack = useTrackStore((state) => state.editTrack);
  const rowHeight = useMemo(() => {
    return Math.max(Math.round(height / rowCount), minRowHeight);
  }, [height, rowCount]);

  useEffect(() => {
    const newHeight = rowHeight * rowCount;
    editTrack<BigBedConfig>(id, { height: newHeight });
  }, [rowHeight, id, editTrack, rowCount]);

  return rowHeight;
}
