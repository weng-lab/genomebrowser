import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { AssemblyDefinition, GenomicRegion } from "@weng-lab/genomebrowser";
import { useId, type ReactNode } from "react";

export type BrowserNavigationControlsProps = {
  assembly: AssemblyDefinition;
  region: GenomicRegion;
  onRegionChange: (region: GenomicRegion) => void;
  disabled?: boolean;
};

const panSteps = [
  { fraction: 1, label: "1×" },
  { fraction: 0.5, label: "½" },
  { fraction: 0.25, label: "¼" },
] as const;

const zoomSteps = [10, 3, 1.5] as const;

const buttonSx = { minWidth: 44, minHeight: 40 } as const;

export function BrowserNavigationControls({
  assembly,
  region,
  onRegionChange,
  disabled = false,
}: BrowserNavigationControlsProps) {
  const panLabelId = useId();
  const zoomLabelId = useId();
  const chromosomeLength = assembly.chromosomes[region.chromosome];
  const regionSpan = region.end - region.start;
  const hasValidRegion =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(region.start) &&
    Number.isSafeInteger(region.end) &&
    regionSpan > 0 &&
    region.start >= 0 &&
    region.end <= chromosomeLength;
  const navigationDisabled = disabled || !hasValidRegion;
  const atStart = navigationDisabled || region.start <= 0;
  const atEnd = navigationDisabled || region.end >= chromosomeLength;
  const atMinimumSpan = navigationDisabled || regionSpan <= 1;
  const atMaximumSpan = navigationDisabled || regionSpan >= chromosomeLength;

  function pan(direction: -1 | 1, fraction: number) {
    if (!hasValidRegion) return;
    const shift = Math.max(1, Math.round(regionSpan * fraction)) * direction;
    const nextStart = clamp(region.start + shift, 0, chromosomeLength - regionSpan);
    if (nextStart === region.start) return;
    onRegionChange({
      chromosome: region.chromosome,
      start: nextStart,
      end: nextStart + regionSpan,
    });
  }

  function zoom(direction: "in" | "out", factor: number) {
    if (!hasValidRegion) return;
    const requestedSpan = direction === "in" ? regionSpan / factor : regionSpan * factor;
    const nextSpan = clamp(Math.round(requestedSpan), 1, chromosomeLength);
    if (nextSpan === regionSpan) return;
    const center = region.start + regionSpan / 2;
    const nextStart = clamp(Math.round(center - nextSpan / 2), 0, chromosomeLength - nextSpan);
    onRegionChange({
      chromosome: region.chromosome,
      start: nextStart,
      end: nextStart + nextSpan,
    });
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2 }}>
      <Box aria-labelledby={panLabelId} role="group">
        <Typography id={panLabelId} variant="caption" component="div" sx={{ mb: 0.5 }}>
          Pan
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          <Box
            aria-label="Pan left"
            role="group"
            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
          >
            {panSteps.map(({ fraction, label }) => (
              <NavigationButton
                key={fraction}
                disabled={atStart}
                label={`Pan left by ${formatPanStep(fraction)}`}
                onClick={() => pan(-1, fraction)}
                startIcon={<ArrowBackIcon />}
              >
                {label}
              </NavigationButton>
            ))}
          </Box>
          <Box
            aria-label="Pan right"
            role="group"
            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
          >
            {panSteps.toReversed().map(({ fraction, label }) => (
              <NavigationButton
                key={fraction}
                disabled={atEnd}
                endIcon={<ArrowForwardIcon />}
                label={`Pan right by ${formatPanStep(fraction)}`}
                onClick={() => pan(1, fraction)}
              >
                {label}
              </NavigationButton>
            ))}
          </Box>
        </Box>
      </Box>

      <Box aria-labelledby={zoomLabelId} role="group">
        <Typography id={zoomLabelId} variant="caption" component="div" sx={{ mb: 0.5 }}>
          Zoom
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          <Box
            aria-label="Zoom out"
            role="group"
            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
          >
            {zoomSteps.map((factor) => (
              <NavigationButton
                key={factor}
                disabled={atMaximumSpan}
                label={`Zoom out ${factor}×`}
                onClick={() => zoom("out", factor)}
                startIcon={<ZoomOutIcon />}
              >
                {factor}×
              </NavigationButton>
            ))}
          </Box>
          <Box
            aria-label="Zoom in"
            role="group"
            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
          >
            {zoomSteps.toReversed().map((factor) => (
              <NavigationButton
                key={factor}
                disabled={atMinimumSpan}
                endIcon={<ZoomInIcon />}
                label={`Zoom in ${factor}×`}
                onClick={() => zoom("in", factor)}
              >
                {factor}×
              </NavigationButton>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function NavigationButton({
  children,
  disabled,
  endIcon,
  label,
  onClick,
  startIcon,
}: {
  children: ReactNode;
  disabled: boolean;
  endIcon?: ReactNode;
  label: string;
  onClick: () => void;
  startIcon?: ReactNode;
}) {
  const button = (
    <Button
      aria-label={label}
      disabled={disabled}
      endIcon={endIcon}
      onClick={onClick}
      size="small"
      startIcon={startIcon}
      sx={buttonSx}
      variant="outlined"
    >
      {children}
    </Button>
  );

  return (
    <Tooltip title={label}>
      {disabled ? <span style={{ display: "inline-flex" }}>{button}</span> : button}
    </Tooltip>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatPanStep(fraction: number) {
  if (fraction === 1) return "one viewport";
  if (fraction === 0.5) return "half a viewport";
  return "a quarter viewport";
}
