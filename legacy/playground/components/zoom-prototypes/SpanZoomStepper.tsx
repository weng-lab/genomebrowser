// THROWAWAY_UI: disposable zoom-control prototype.
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactElement } from "react";
import { formatSpan, type ZoomPrototypeProps } from "./shared";

const ZOOM_OUT_FACTOR = 2;
const ZOOM_IN_FACTOR = 0.5;

export function SpanZoomStepper({ useBrowserStore }: ZoomPrototypeProps) {
  const chromosome = useBrowserStore((state) => state.region.chromosome);
  const start = useBrowserStore((state) => state.region.start);
  const end = useBrowserStore((state) => state.region.end);
  const chromosomeLength = useBrowserStore(
    (state) => state.assembly.chromosomes[state.region.chromosome],
  );

  const span = end - start;
  const atMaximumSpan = span >= chromosomeLength;
  const atMinimumSpan = span <= 1;

  const zoom = (factor: number) => {
    useBrowserStore.getState().zoom(factor);
  };

  return (
    <Box
      aria-label="Zoom viewport"
      role="group"
      sx={{ alignItems: "center", display: "inline-flex", gap: 0.5 }}
    >
      <StepperButton
        disabled={atMaximumSpan}
        icon={<ZoomOutIcon fontSize="small" />}
        label={`Zoom out 2× — more context, ${formatSpan(
          projectSpan(span, ZOOM_OUT_FACTOR, chromosomeLength),
        )} in view`}
        onClick={() => zoom(ZOOM_OUT_FACTOR)}
      />

      <Box sx={{ minWidth: 140, px: 1, textAlign: "center" }}>
        <Typography
          component="div"
          sx={{ color: "text.secondary", lineHeight: 1.2 }}
          variant="caption"
        >
          Viewed span
        </Typography>
        <Typography
          aria-live="polite"
          component="div"
          sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}
          variant="body2"
        >
          {formatSpan(span)}
        </Typography>
        <Typography
          component="div"
          sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
          variant="caption"
        >
          {chromosome}:{start.toLocaleString()}-{end.toLocaleString()}
        </Typography>
      </Box>

      <StepperButton
        disabled={atMinimumSpan}
        icon={<ZoomInIcon fontSize="small" />}
        label={`Zoom in 2× — more detail, ${formatSpan(
          projectSpan(span, ZOOM_IN_FACTOR, chromosomeLength),
        )} in view`}
        onClick={() => zoom(ZOOM_IN_FACTOR)}
      />
    </Box>
  );
}

function StepperButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: ReactElement;
  label: string;
  onClick: () => void;
}) {
  const button = (
    <IconButton aria-label={label} disabled={disabled} onClick={onClick} size="small">
      {icon}
    </IconButton>
  );

  return (
    <Tooltip title={label}>
      {disabled ? (
        <Box component="span" sx={{ display: "inline-flex" }}>
          {button}
        </Box>
      ) : (
        button
      )}
    </Tooltip>
  );
}

function projectSpan(span: number, factor: number, chromosomeLength: number) {
  return Math.min(chromosomeLength, Math.max(1, Math.round(span * factor)));
}
