// THROWAWAY_UI: shared types for the disposable zoom-control comparison.
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";

export type ZoomPrototypeProps = {
  useBrowserStore: BrowserStoreInstance;
};

export function formatSpan(span: number) {
  if (span >= 1_000_000) return `${formatNumber(span / 1_000_000)} Mb`;
  if (span >= 1_000) return `${formatNumber(span / 1_000)} kb`;
  return `${span.toLocaleString()} bp`;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 1 : 0 });
}
