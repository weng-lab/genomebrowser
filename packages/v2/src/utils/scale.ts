import type { BrowserRegion } from "./region";

export function createXScale(region: BrowserRegion, width: number) {
  const span = region.end - region.start;
  return (value: number) => ((value - region.start) * width) / span;
}

export function createReverseXScale(region: BrowserRegion, width: number) {
  const span = region.end - region.start;
  return (value: number) => Math.round(region.start + (value / width) * span);
}
