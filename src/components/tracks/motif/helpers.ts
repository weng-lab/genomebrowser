import { groupFeatures } from "../../../utils/coordinates";
import { MotifRect } from "./types";

export function renderSquishMotifData(data: MotifRect[], x: (value: number) => number): MotifRect[][] {
  return groupFeatures(
    data
      .sort((a, b) => a.start - b.start)
      .map((x) => ({ coordinates: { start: x.start, end: x.end }, pwm: x.pwm, name: "" })),
    x,
    0
  ).map((group) =>
    group.map((feature) => {
      const s = 0;
      const e = (feature.pwm && feature.pwm.length) || 0;
      const pwm = feature.pwm ? feature.pwm?.slice(s, e) : undefined;
      return {
        start: x(feature.coordinates.start) < 0 ? 0 : x(feature.coordinates.start),
        end: x(feature.coordinates.end),
        pwm: pwm,
      };
    })
  );
}

export function renderDenseMotifData(data: MotifRect[], x: (value: number) => number): MotifRect[] {
  const results: MotifRect[] = [];
  const d = data.sort((a, b) => a.start - b.start);
  d.forEach((current, i) => {
    const s = 0;
    const e = (current.pwm && current.pwm.length) || 0;
    const pwm = current.pwm ? current.pwm?.slice(s, e) : undefined;

    if (i === 0 || current.start > d[i - 1].end) {
      results.push({
        start: x(current.start) < 0 ? 0 : x(current.start),
        end: x(current.end) < 0 ? 0 : x(current.end),
        pwm: pwm,
      });
    } else results[results.length - 1].end = x(current.end);
  });
  return results;
}
