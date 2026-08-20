import { useTrackStore } from "@weng-lab/genomebrowser";
import { useEffect } from "react";
import { z } from "zod";

export type RowLayoutConfig = {
  rowHeight: number;
};

export const minimumRowHeight = 1;
export const defaultRowHeight = 12;
export const rowHeightSchema = z.number().finite().min(minimumRowHeight);

export function isRowLayoutConfig(value: unknown): value is RowLayoutConfig {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return isValidRowHeight((value as { rowHeight?: unknown }).rowHeight);
}

export function rowCountFromTrackHeight(trackHeight: number, rowHeight: number): number {
  assertTrackHeight(trackHeight);
  assertRowHeight(rowHeight);
  return Math.max(1, Math.round(trackHeight / rowHeight));
}

export function rowHeightFromTrackHeight(trackHeight: number, rowCount: number): number {
  assertTrackHeight(trackHeight);
  const rowHeight = trackHeight / visibleRowCount(rowCount);
  assertRowHeight(rowHeight);
  return rowHeight;
}

export function trackHeightFromRowCount(rowCount: number, rowHeight: number): number {
  assertRowHeight(rowHeight);
  return visibleRowCount(rowCount) * rowHeight;
}

export function useRowLayout(trackId: string, rowCount: number, config: RowLayoutConfig) {
  if (!isRowLayoutConfig(config)) {
    throw new RangeError("config.rowHeight must be a finite number of at least 1 pixel.");
  }

  const currentHeight = useTrackStore((state) => state.getTrack(trackId)?.base.height);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const rowHeight = config.rowHeight;
  const trackHeight = trackHeightFromRowCount(rowCount, rowHeight);

  useEffect(() => {
    if (currentHeight !== undefined && currentHeight !== trackHeight) {
      updateTrack(trackId, { base: { height: trackHeight } });
    }
  }, [currentHeight, trackHeight, trackId, updateTrack]);

  return { rowHeight, trackHeight };
}

function visibleRowCount(rowCount: number): number {
  if (!Number.isInteger(rowCount) || rowCount < 0) {
    throw new RangeError("rowCount must be a non-negative integer.");
  }
  return Math.max(1, rowCount);
}

function assertRowHeight(rowHeight: number): void {
  if (!isValidRowHeight(rowHeight)) {
    throw new RangeError("rowHeight must be a finite number of at least 1 pixel.");
  }
}

function isValidRowHeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimumRowHeight;
}

function assertTrackHeight(trackHeight: number): void {
  if (!Number.isFinite(trackHeight) || trackHeight <= 0) {
    throw new RangeError("trackHeight must be a positive finite number.");
  }
}
