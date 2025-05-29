import { useCallback, useMemo } from "react";
import {
  ImportanceTrackAnnotation,
  ImportanceTrackData,
  ImportanceTrackDataPoint,
  ImportanceTrackSequence,
} from "./types";

export function useRenderedImportanceTrackAnnotations(
  annotations: ImportanceTrackAnnotation[],
  data: ImportanceTrackDataPoint[],
  transform: (x: number) => number
) {
  return useMemo(
    () =>
      annotations.map((annotation) => {
        const points = data.slice(annotation.coordinates[0], annotation.coordinates[1] + 1).map((x) => x.importance);
        const range = [Math.min(...points), Math.max(...points)];
        const t = transform(range[1]);
        return {
          ...annotation,
          y: t,
          height: transform(range[0]) - t,
        };
      }),
    [annotations, transform]
  );
}

export function useRenderedImportanceTrackData(
  data: ImportanceTrackData,
  height: number
): [ImportanceTrackDataPoint[], (x: number) => [number, number, string], (x: number) => number] {
  const rendered = useMemo(
    () =>
      isImportanceTrackSequence(data)
        ? data.importance.map((x: number, i: number) => ({
            base: (data as ImportanceTrackSequence).sequence.charAt(i),
            importance: x,
          }))
        : data,
    [data]
  );
  const range = useMemo(() => yRange(rendered, (x: ImportanceTrackDataPoint) => x.importance), [rendered]);
  const rawTransform = linearTransform(range, { start: height, end: 0 });
  const transform = useCallback(svgElementTransform(rawTransform), [range, height]);
  return [rendered, transform, rawTransform];
}

export function isImportanceTrackSequence(data: ImportanceTrackData): data is ImportanceTrackSequence {
  return (data as ImportanceTrackSequence).sequence !== undefined;
}

export type Range = {
  start: number;
  end: number;
};
export function linearTransform(initial: Range, final: Range): (value: number) => number {
  return (value: number): number =>
    final.start + (final.end - final.start) * ((value - initial.start) / (initial.end - initial.start));
}

type YRange = {
  start: number;
  end: number;
};
export function yRange<T>(values: T[], transform: (v: T) => number): YRange {
  const v = values.map(transform);
  const start = Math.min(...v);
  const end = Math.max(...v);
  return {
    start: start > 0 ? 0 : start,
    end: end < 0 ? 0 : end,
  };
}

export function svgElementTransform(transform: (x: number) => number): (x: number) => [number, number, string] {
  return (x: number) => {
    const y1 = transform(x < 0 ? x : x);
    const y2 = transform(x < 0 ? 0 : 0);
    const scale = Math.abs(y2 - y1) / 100;
    return [y1 * (x < 0 ? -1 : 1), scale, x < 0 ? "scale(1,-1)" : ""];
  };
}
