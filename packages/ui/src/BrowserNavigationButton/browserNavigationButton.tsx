import Button, { type ButtonProps } from "@mui/material/Button";
import type {
  AssemblyDefinition,
  BrowserStoreInstance,
  GenomicRegion,
} from "@weng-lab/genomebrowser";

export type BrowserNavigationAction =
  | { type: "pan"; fraction: number }
  | { type: "zoom"; factor: number };

export type BrowserNavigationButtonProps = Omit<ButtonProps, "action" | "onClick"> & {
  browserStore: BrowserStoreInstance;
  action: BrowserNavigationAction;
};

export function BrowserNavigationButton({
  action,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  browserStore,
  disabled = false,
  ...buttonProps
}: BrowserNavigationButtonProps) {
  const useBrowserStore = browserStore;
  const assembly = useBrowserStore((state) => state.assembly);
  const region = useBrowserStore((state) => state.region);
  const navigationDisabled = isNavigationUnavailable(action, assembly, region);
  const resolvedAriaLabel = ariaLabel || (ariaLabelledBy ? undefined : getActionName(action));

  function handleClick() {
    const state = useBrowserStore.getState();
    if (disabled || isNavigationUnavailable(action, state.assembly, state.region)) return;

    if (action.type === "zoom") {
      state.zoom(action.factor);
      return;
    }

    const chromosomeLength = state.assembly.chromosomes[state.region.chromosome];
    const regionSpan = state.region.end - state.region.start;
    const direction = action.fraction < 0 ? -1 : 1;
    const shift = Math.max(1, Math.round(regionSpan * Math.abs(action.fraction))) * direction;
    const nextStart = clamp(state.region.start + shift, 0, chromosomeLength - regionSpan);

    state.setRegion({
      chromosome: state.region.chromosome,
      start: nextStart,
      end: nextStart + regionSpan,
    });
  }

  return (
    <Button
      {...buttonProps}
      aria-label={resolvedAriaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled || navigationDisabled}
      onClick={handleClick}
    />
  );
}

function isNavigationUnavailable(
  action: BrowserNavigationAction,
  assembly: AssemblyDefinition,
  region: GenomicRegion,
) {
  const chromosomeLength = assembly.chromosomes[region.chromosome];
  const regionSpan = region.end - region.start;
  const hasValidRegion =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(region.start) &&
    Number.isSafeInteger(region.end) &&
    regionSpan > 0 &&
    region.start >= 0 &&
    region.end <= chromosomeLength;

  if (!hasValidRegion) return true;

  if (action.type === "pan") {
    if (!Number.isFinite(action.fraction) || action.fraction === 0) return true;
    return action.fraction < 0 ? region.start <= 0 : region.end >= chromosomeLength;
  }

  if (!Number.isFinite(action.factor) || action.factor <= 0 || action.factor === 1) return true;
  return action.factor < 1 ? regionSpan <= 1 : regionSpan >= chromosomeLength;
}

function getActionName(action: BrowserNavigationAction) {
  if (action.type === "pan") {
    if (action.fraction < 0) return "Pan left";
    if (action.fraction > 0) return "Pan right";
    return "Pan";
  }

  if (action.factor < 1) return "Zoom in";
  if (action.factor > 1) return "Zoom out";
  return "Zoom";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
