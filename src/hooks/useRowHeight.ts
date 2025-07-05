import { useEffect } from "react";
import { BigBedConfig } from "../components/tracks/bigbed/types";
import { useTrackStore } from "../store/trackStore";

export function useRowHeight(rowCount: number, id: string, rowHeight: number = 12) {
  const editTrack = useTrackStore((state) => state.editTrack);

  useEffect(() => {
    const newHeight = Math.max(rowHeight * rowCount, 30);
    editTrack<BigBedConfig>(id, { height: newHeight });
  }, [rowHeight, id, editTrack, rowCount]);

  return rowHeight + 2;
}
