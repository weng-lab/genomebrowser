// THROWAWAY_UI: disposable variations on the span-stepper zoom concept.
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactElement } from "react";
import { formatSpan, type ZoomPrototypeProps } from "./shared";

const ZOOM_OUT_FACTOR = 2;
const ZOOM_IN_FACTOR = 0.5;

const SCALE_TICKS = [
  { value: 1, label: "1 bp" },
  { value: 1_000, label: "1 kb" },
  { value: 1_000_000, label: "1 Mb" },
] as const;

/** A genomic scale readout with controls balanced around the current view. */
export function SpanZoomScaleBar({ useBrowserStore }: ZoomPrototypeProps) {
  const view = useSpanView(useBrowserStore);
  const hasScale = view.usable && view.chromosomeLength > 1;
  const detailFraction = hasScale ? 1 - logFraction(view.span, view.chromosomeLength) : 0;
  const percentOfChromosome = hasScale ? (view.span / view.chromosomeLength) * 100 : undefined;

  return (
    <Box
      aria-label="Zoom viewport"
      role="group"
      sx={{ alignItems: "center", display: "flex", gap: 1, minWidth: 320, width: "100%" }}
    >
      <ControlHint title={view.zoomOutHint}>
        <IconButton
          aria-label={view.zoomOutHint}
          disabled={view.atMaximumSpan}
          size="small"
          onClick={() => view.zoom(ZOOM_OUT_FACTOR)}
        >
          <ZoomOutIcon fontSize="small" />
        </IconButton>
      </ControlHint>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ alignItems: "baseline", display: "flex", justifyContent: "space-between" }}>
          <Typography color="text.secondary" variant="caption">
            Viewed span
          </Typography>
          <Typography
            aria-live="polite"
            sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
            variant="body2"
          >
            {formatSpan(view.span)}
          </Typography>
        </Box>

        {hasScale ? (
          <Box
            aria-label={`${formatSpan(view.span)} in view on ${view.chromosome}, which is ${formatSpan(
              view.chromosomeLength,
            )}`}
            role="img"
            sx={{ mt: 0.75 }}
          >
            <Box
              sx={{
                bgcolor: "action.hover",
                borderRadius: 1,
                height: 6,
                position: "relative",
                width: "100%",
              }}
            >
              <Box
                sx={{
                  bgcolor: "primary.main",
                  borderRadius: 1,
                  bottom: -3,
                  left: `${detailFraction * 100}%`,
                  position: "absolute",
                  top: -3,
                  transform: "translateX(-50%)",
                  width: 3,
                }}
              />
            </Box>
            <Box sx={{ height: 16, mt: 0.5, position: "relative" }}>
              <ScaleTickLabel fraction={0} label={formatSpan(view.chromosomeLength)} />
              {SCALE_TICKS.filter(
                (tick) => tick.value > 1 && tick.value < view.chromosomeLength / 10,
              ).map((tick) => (
                <ScaleTickLabel
                  key={tick.value}
                  fraction={1 - logFraction(tick.value, view.chromosomeLength)}
                  label={tick.label}
                />
              ))}
              <ScaleTickLabel fraction={1} label="1 bp" />
            </Box>
          </Box>
        ) : null}

        <Typography
          color="text.secondary"
          component="div"
          sx={{
            fontVariantNumeric: "tabular-nums",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          variant="caption"
        >
          {view.coordinates}
          {percentOfChromosome === undefined
            ? ""
            : ` · ${formatPercent(percentOfChromosome)} of ${view.chromosome}`}
        </Typography>
      </Box>

      <ControlHint title={view.zoomInHint}>
        <IconButton
          aria-label={view.zoomInHint}
          disabled={view.atMinimumSpan}
          size="small"
          onClick={() => view.zoom(ZOOM_IN_FACTOR)}
        >
          <ZoomInIcon fontSize="small" />
        </IconButton>
      </ControlHint>
    </Box>
  );
}

/** A conventional toolbar separating coordinates from its trailing span readout. */
export function SpanZoomToolbar({ useBrowserStore }: ZoomPrototypeProps) {
  const view = useSpanView(useBrowserStore);

  return (
    <Paper
      aria-label="Zoom viewport"
      role="group"
      variant="outlined"
      sx={{
        alignItems: "center",
        display: "flex",
        gap: 1,
        minWidth: 320,
        px: 1,
        py: 0.5,
        width: "100%",
      }}
    >
      <ButtonGroup
        aria-label="Zoom"
        size="small"
        variant="outlined"
        sx={{ "& .MuiButton-root": { minWidth: 40, px: 0 } }}
      >
        <Button
          aria-label={view.zoomOutHint}
          disabled={view.atMaximumSpan}
          title={view.zoomOutHint}
          onClick={() => view.zoom(ZOOM_OUT_FACTOR)}
        >
          <ZoomOutIcon fontSize="small" />
        </Button>
        <Button
          aria-label={view.zoomInHint}
          disabled={view.atMinimumSpan}
          title={view.zoomInHint}
          onClick={() => view.zoom(ZOOM_IN_FACTOR)}
        >
          <ZoomInIcon fontSize="small" />
        </Button>
      </ButtonGroup>

      <Divider flexItem orientation="vertical" />

      <Typography
        sx={{
          flexGrow: 1,
          fontVariantNumeric: "tabular-nums",
          minWidth: 0,
          overflow: "hidden",
          textAlign: "center",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        variant="body2"
      >
        {view.coordinates}
      </Typography>

      <Divider flexItem orientation="vertical" />

      <Box sx={{ alignItems: "center", display: "flex", gap: 0.75 }}>
        <Typography color="text.secondary" variant="caption">
          Span
        </Typography>
        <Chip
          aria-live="polite"
          label={formatSpan(view.span)}
          size="small"
          variant="outlined"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        />
      </Box>
    </Paper>
  );
}

/** Intent-first controls that keep the exact base-pair span visible. */
export function SpanZoomContextDetail({ useBrowserStore }: ZoomPrototypeProps) {
  const view = useSpanView(useBrowserStore);

  return (
    <Box
      aria-label="Zoom viewport"
      role="group"
      sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 300, width: "100%" }}
    >
      <Box sx={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        <Typography color="text.secondary" variant="caption">
          Viewing
        </Typography>
        <Typography
          aria-live="polite"
          sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
          variant="body2"
        >
          {view.span.toLocaleString()} bp
        </Typography>
        <Typography
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums" }}
          variant="caption"
        >
          {view.coordinates}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <IntentButton
          disabled={view.atMaximumSpan}
          hint={view.zoomOutHint}
          icon={<ZoomOutIcon fontSize="small" />}
          label="More context"
          preview={
            view.atMaximumSpan
              ? "Whole chromosome"
              : `${formatSpan(view.projectSpan(ZOOM_OUT_FACTOR))} in view`
          }
          onClick={() => view.zoom(ZOOM_OUT_FACTOR)}
        />
        <IntentButton
          disabled={view.atMinimumSpan}
          hint={view.zoomInHint}
          icon={<ZoomInIcon fontSize="small" />}
          label="More detail"
          preview={
            view.atMinimumSpan
              ? "Single base"
              : `${formatSpan(view.projectSpan(ZOOM_IN_FACTOR))} in view`
          }
          onClick={() => view.zoom(ZOOM_IN_FACTOR)}
        />
      </Box>
    </Box>
  );
}

function useSpanView(useBrowserStore: ZoomPrototypeProps["useBrowserStore"]) {
  const chromosome = useBrowserStore((state) => state.region.chromosome);
  const start = useBrowserStore((state) => state.region.start);
  const end = useBrowserStore((state) => state.region.end);
  const chromosomeLength = useBrowserStore(
    (state) => state.assembly.chromosomes[state.region.chromosome],
  );

  const span = end - start;
  const usable =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    span > 0;
  const atMaximumSpan = !usable || span >= chromosomeLength;
  const atMinimumSpan = !usable || span <= 1;

  const projectSpan = (factor: number) =>
    Math.min(chromosomeLength, Math.max(1, Math.round(span * factor)));

  return {
    atMaximumSpan,
    atMinimumSpan,
    chromosome,
    chromosomeLength,
    coordinates: `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`,
    projectSpan,
    span,
    usable,
    zoom: (factor: number) => {
      useBrowserStore.getState().zoom(factor);
    },
    zoomOutHint: atMaximumSpan
      ? `Zoom out — ${chromosome} is already fully in view`
      : `Zoom out 2× for more context — ${formatSpan(projectSpan(ZOOM_OUT_FACTOR))} in view`,
    zoomInHint: atMinimumSpan
      ? "Zoom in — already at single-base detail"
      : `Zoom in 2× for more detail — ${formatSpan(projectSpan(ZOOM_IN_FACTOR))} in view`,
  };
}

function IntentButton({
  disabled,
  hint,
  icon,
  label,
  preview,
  onClick,
}: {
  disabled: boolean;
  hint: string;
  icon: ReactElement;
  label: string;
  preview: string;
  onClick: () => void;
}) {
  return (
    <ControlHint fullWidth title={hint}>
      <Button
        aria-label={hint}
        disabled={disabled}
        fullWidth
        size="small"
        startIcon={icon}
        variant="outlined"
        sx={{ justifyContent: "flex-start", px: 1.25, py: 0.75, textTransform: "none" }}
        onClick={onClick}
      >
        <Box sx={{ minWidth: 0, textAlign: "left" }}>
          <Typography component="div" sx={{ lineHeight: 1.3 }} variant="body2">
            {label}
          </Typography>
          <Typography
            color="text.secondary"
            component="div"
            sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
            variant="caption"
          >
            {preview}
          </Typography>
        </Box>
      </Button>
    </ControlHint>
  );
}

function ControlHint({
  children,
  fullWidth = false,
  title,
}: {
  children: ReactElement;
  fullWidth?: boolean;
  title: string;
}) {
  return (
    <Tooltip title={title}>
      <Box
        component="span"
        sx={{ display: fullWidth ? "flex" : "inline-flex", width: fullWidth ? "100%" : undefined }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

function ScaleTickLabel({ fraction, label }: { fraction: number; label: string }) {
  const transform =
    fraction <= 0 ? "none" : fraction >= 1 ? "translateX(-100%)" : "translateX(-50%)";

  return (
    <Typography
      aria-hidden
      color="text.secondary"
      component="span"
      sx={{
        left: `${fraction * 100}%`,
        lineHeight: 1,
        position: "absolute",
        top: 0,
        transform,
        whiteSpace: "nowrap",
      }}
      variant="caption"
    >
      {label}
    </Typography>
  );
}

function logFraction(value: number, max: number) {
  if (!(max > 1) || !(value > 0)) return 0;
  const clamped = Math.min(max, Math.max(1, value));
  return Math.log(clamped) / Math.log(max);
}

function formatPercent(percent: number) {
  if (percent >= 1) return `${percent.toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;
  return `${percent.toLocaleString(undefined, { maximumSignificantDigits: 2 })}%`;
}
