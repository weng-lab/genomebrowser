// THROWAWAY_UI: disposable hybrids of the favored zoom-control prototypes.
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId, useState, type ReactNode, type SyntheticEvent } from "react";

import { formatSpan, type ZoomPrototypeProps } from "./shared";

const zoomAmounts = [1.5, 3, 10] as const;
type ZoomAmount = (typeof zoomAmounts)[number];

const scaleTargets = [
  { value: 1, label: "Base", detail: "1 bp" },
  { value: 3, label: "Codon", detail: "3 bp" },
  { value: 250, label: "Exon", detail: "250 bp" },
  { value: 25_000, label: "Gene", detail: "25 kb" },
  { value: 250_000, label: "Locus", detail: "250 kb" },
  { value: 10_000_000, label: "Band", detail: "10 Mb" },
] as const;

export function CenteredStepToolbar({ useBrowserStore }: ZoomPrototypeProps) {
  const view = useZoomView(useBrowserStore);
  const [amount, setAmount] = useState<ZoomAmount>(1.5);

  return (
    <ZoomToolbar>
      <ZoomButton
        amount={amount}
        direction="out"
        disabled={view.atMaximumSpan}
        onClick={() => view.zoom(amount)}
      />
      <Stack alignItems="center" spacing={0.75} sx={{ minWidth: 180 }}>
        <ViewportReadout coordinates={view.coordinates} span={view.span} />
        <ZoomStepSelect amount={amount} onChange={setAmount} />
      </Stack>
      <ZoomButton
        amount={amount}
        direction="in"
        disabled={view.atMinimumSpan}
        onClick={() => view.zoom(1 / amount)}
      />
    </ZoomToolbar>
  );
}

export function ScaleReadoutToolbar({ useBrowserStore }: ZoomPrototypeProps) {
  const view = useZoomView(useBrowserStore);
  const [amount, setAmount] = useState<ZoomAmount>(1.5);

  return (
    <Paper
      aria-label="Zoom viewport with genomic scale readout"
      role="group"
      variant="outlined"
      sx={{ p: 1, width: "100%" }}
    >
      <Stack spacing={1.25}>
        <Box
          sx={{
            alignItems: "center",
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "auto minmax(180px, 1fr) auto" },
          }}
        >
          <ZoomButton
            amount={amount}
            direction="out"
            disabled={view.atMaximumSpan}
            onClick={() => view.zoom(amount)}
          />
          <Stack alignItems="center" spacing={0.75}>
            <ViewportReadout coordinates={view.coordinates} span={view.span} />
            <ZoomStepSelect amount={amount} onChange={setAmount} />
          </Stack>
          <ZoomButton
            amount={amount}
            direction="in"
            disabled={view.atMinimumSpan}
            onClick={() => view.zoom(1 / amount)}
          />
        </Box>
        <GenomicScaleReadout chromosomeLength={view.chromosomeLength} span={view.span} />
      </Stack>
    </Paper>
  );
}

export function DirectScaleScrubber({ useBrowserStore }: ZoomPrototypeProps) {
  const view = useZoomView(useBrowserStore);
  const [previewSpan, setPreviewSpan] = useState<number | null>(null);
  const shownSpan = previewSpan ?? view.span;
  const maximumLog = Math.max(0, Math.log10(view.chromosomeLength));
  const sliderValue = maximumLog - Math.log10(Math.max(1, shownSpan));
  const marks = makeScaleMarks(view.chromosomeLength);

  function handleSliderChange(_: Event, value: number | number[]) {
    if (typeof value === "number") setPreviewSpan(scaleValueToSpan(value, view.chromosomeLength));
  }

  function handleSliderCommit(_: Event | SyntheticEvent, value: number | number[]) {
    if (typeof value !== "number") return;
    view.setSpan(scaleValueToSpan(value, view.chromosomeLength));
    setPreviewSpan(null);
  }

  return (
    <Paper
      aria-label="Direct genomic scale control"
      role="group"
      variant="outlined"
      sx={{ p: 1, width: "100%" }}
    >
      <Stack spacing={1.25}>
        <ViewportReadout
          coordinates={view.coordinates}
          previewSpan={previewSpan}
          span={shownSpan}
        />
        <Box
          sx={{
            alignItems: "center",
            display: "grid",
            gap: { xs: 1, sm: 2 },
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "auto minmax(160px, 1fr) auto" },
          }}
        >
          <ZoomButton
            amount={2}
            direction="out"
            disabled={view.atMaximumSpan}
            showAmount
            onClick={() => view.zoom(2)}
          />
          <Slider
            aria-label="Viewed genomic span"
            disabled={!view.usable || view.chromosomeLength <= 1}
            marks={marks}
            max={maximumLog}
            min={0}
            step={0.01}
            value={sliderValue}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatSpan(scaleValueToSpan(value, view.chromosomeLength))}
            getAriaValueText={(value) =>
              `${formatSpan(scaleValueToSpan(value, view.chromosomeLength))} in view`
            }
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderCommit}
            sx={{
              justifySelf: "center",
              width: "calc(100% - 16px)",
              "& .MuiSlider-markLabel": { display: { xs: "none", sm: "block" } },
              [`& .MuiSlider-markLabel[data-index="0"]`]: {
                display: "block",
                transform: "none",
              },
              [`& .MuiSlider-markLabel[data-index="${marks.length - 1}"]`]: {
                display: "block",
                transform: "translateX(-100%)",
              },
            }}
          />
          <ZoomButton
            amount={2}
            direction="in"
            disabled={view.atMinimumSpan}
            showAmount
            onClick={() => view.zoom(0.5)}
          />
        </Box>
      </Stack>
    </Paper>
  );
}

export function BiologicalScaleToolbar({ useBrowserStore }: ZoomPrototypeProps) {
  const view = useZoomView(useBrowserStore);
  const [amount, setAmount] = useState<ZoomAmount>(1.5);
  const jumpLabelId = useId();

  function handleScaleChange(event: SelectChangeEvent<string>) {
    const target = Number(event.target.value);
    if (Number.isFinite(target)) view.setSpan(target || view.chromosomeLength);
  }

  return (
    <Paper
      aria-label="Zoom viewport and jump to biological scale"
      role="group"
      variant="outlined"
      sx={{ p: 1, width: "100%" }}
    >
      <Stack alignItems="center" spacing={1.25}>
        <ViewportReadout coordinates={view.coordinates} span={view.span} />
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            width: "100%",
          }}
        >
          <Stack direction="row" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <ZoomButton
                amount={amount}
                direction="out"
                disabled={view.atMaximumSpan}
                fullWidth
                onClick={() => view.zoom(amount)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <ZoomButton
                amount={amount}
                direction="in"
                disabled={view.atMinimumSpan}
                fullWidth
                onClick={() => view.zoom(1 / amount)}
              />
            </Box>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <ZoomStepSelect amount={amount} onChange={setAmount} />
            <FormControl fullWidth size="small">
              <InputLabel id={jumpLabelId} shrink>
                Jump to scale
              </InputLabel>
              <Select
                displayEmpty
                label="Jump to scale"
                labelId={jumpLabelId}
                renderValue={() => "Choose destination"}
                value=""
                onChange={handleScaleChange}
              >
                {scaleTargets.map((target) => (
                  <MenuItem
                    key={target.label}
                    disabled={target.value > view.chromosomeLength}
                    value={target.value}
                  >
                    {target.label} · {target.detail}
                  </MenuItem>
                ))}
                <MenuItem value={0}>
                  Whole chromosome · {formatSpan(view.chromosomeLength)}
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function ZoomToolbar({ children }: { children: ReactNode }) {
  return (
    <Paper
      aria-label="Zoom viewport"
      role="group"
      variant="outlined"
      sx={{
        alignItems: "center",
        display: "grid",
        gap: 1,
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "auto minmax(180px, 1fr) auto" },
        p: 1,
        width: "100%",
      }}
    >
      {children}
    </Paper>
  );
}

function ViewportReadout({
  coordinates,
  previewSpan,
  span,
}: {
  coordinates: string;
  previewSpan?: number | null;
  span: number;
}) {
  return (
    <Box sx={{ minWidth: 0, textAlign: "center" }}>
      <Typography
        sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, lineHeight: 1.3 }}
        variant="body2"
      >
        {formatSpan(span)}{" "}
        {previewSpan === null || previewSpan === undefined ? "in view" : "target"}
      </Typography>
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
        {coordinates}
      </Typography>
    </Box>
  );
}

function ZoomStepSelect({
  amount,
  onChange,
}: {
  amount: ZoomAmount;
  onChange: (amount: ZoomAmount) => void;
}) {
  const labelId = useId();

  return (
    <FormControl size="small" sx={{ minWidth: 116 }}>
      <InputLabel id={labelId}>Zoom step</InputLabel>
      <Select
        label="Zoom step"
        labelId={labelId}
        value={amount}
        onChange={(event) => onChange(Number(event.target.value) as ZoomAmount)}
      >
        {zoomAmounts.map((option) => (
          <MenuItem key={option} value={option}>
            {option}×
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function ZoomButton({
  amount,
  direction,
  disabled,
  fullWidth = false,
  showAmount = false,
  onClick,
}: {
  amount: number;
  direction: "in" | "out";
  disabled: boolean;
  fullWidth?: boolean;
  showAmount?: boolean;
  onClick: () => void;
}) {
  const zoomingOut = direction === "out";
  const label = `Zoom ${direction} ${amount}×`;

  return (
    <Button
      aria-label={label}
      disabled={disabled}
      endIcon={zoomingOut ? undefined : <ZoomInIcon fontSize="small" />}
      fullWidth={fullWidth}
      size="small"
      startIcon={zoomingOut ? <ZoomOutIcon fontSize="small" /> : undefined}
      variant="outlined"
      onClick={onClick}
      sx={{ textTransform: "none", whiteSpace: "nowrap" }}
    >
      Zoom {direction}
      {showAmount ? ` ${amount}×` : ""}
    </Button>
  );
}

function GenomicScaleReadout({
  chromosomeLength,
  span,
}: {
  chromosomeLength: number;
  span: number;
}) {
  const fraction = 1 - logFraction(span, chromosomeLength);
  const ticks = [
    { label: "Whole chromosome", fraction: 0 },
    ...[1_000_000, 1_000]
      .filter((value) => value < chromosomeLength)
      .map((value) => ({
        label: formatSpan(value),
        fraction: 1 - logFraction(value, chromosomeLength),
      })),
    { label: "1 bp", fraction: 1 },
  ];

  return (
    <Box
      aria-label={`${formatSpan(span)} in view on a logarithmic scale from ${formatSpan(chromosomeLength)} to 1 bp`}
      role="img"
    >
      <Typography color="text.secondary" component="div" sx={{ mb: 0.5 }} variant="caption">
        Genomic scale readout
      </Typography>
      <Box sx={{ bgcolor: "action.hover", borderRadius: 1, height: 6, position: "relative" }}>
        <Box
          sx={{
            bgcolor: "primary.main",
            borderRadius: 1,
            height: 14,
            left: `${fraction * 100}%`,
            position: "absolute",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 3,
          }}
        />
      </Box>
      <Box sx={{ height: 18, mt: 0.5, position: "relative" }}>
        {ticks.map((tick, index) => (
          <ScaleTickLabel
            key={tick.label}
            fraction={tick.fraction}
            hideAtNarrowWidths={index > 0 && index < ticks.length - 1}
            label={tick.label}
          />
        ))}
      </Box>
    </Box>
  );
}

function useZoomView(useBrowserStore: ZoomPrototypeProps["useBrowserStore"]) {
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
    span > 0 &&
    start >= 0 &&
    end <= chromosomeLength;

  return {
    atMaximumSpan: !usable || span >= chromosomeLength,
    atMinimumSpan: !usable || span <= 1,
    chromosomeLength,
    coordinates: `${chromosome}:${start.toLocaleString()}–${end.toLocaleString()}`,
    setSpan: (requestedSpan: number) => {
      const nextSpan = Math.min(chromosomeLength, Math.max(1, Math.round(requestedSpan)));
      const midpoint = (start + end) / 2;
      const nextStart = Math.min(
        chromosomeLength - nextSpan,
        Math.max(0, Math.round(midpoint - nextSpan / 2)),
      );
      useBrowserStore.getState().setRegion({
        chromosome,
        start: nextStart,
        end: nextStart + nextSpan,
      });
    },
    span,
    usable,
    zoom: (factor: number) => useBrowserStore.getState().zoom(factor),
  };
}

function makeScaleMarks(chromosomeLength: number) {
  const maximumLog = Math.log10(chromosomeLength);
  const values = [1, 1_000, 1_000_000].filter((value) => value < chromosomeLength);
  return [
    { label: "Chromosome", value: 0 },
    ...values
      .toReversed()
      .map((value) => ({ label: formatSpan(value), value: maximumLog - Math.log10(value) })),
  ];
}

function scaleValueToSpan(value: number, chromosomeLength: number) {
  return Math.min(
    chromosomeLength,
    Math.max(1, Math.round(10 ** (Math.log10(chromosomeLength) - value))),
  );
}

function logFraction(value: number, maximum: number) {
  if (!(maximum > 1) || !(value > 0)) return 0;
  return Math.log(Math.min(maximum, Math.max(1, value))) / Math.log(maximum);
}

function ScaleTickLabel({
  fraction,
  hideAtNarrowWidths,
  label,
}: {
  fraction: number;
  hideAtNarrowWidths: boolean;
  label: string;
}) {
  const transform =
    fraction <= 0 ? "none" : fraction >= 1 ? "translateX(-100%)" : "translateX(-50%)";

  return (
    <Typography
      aria-hidden
      color="text.secondary"
      component="span"
      sx={{
        display: hideAtNarrowWidths ? { xs: "none", sm: "inline" } : "inline",
        left: `${fraction * 100}%`,
        position: "absolute",
        transform,
        whiteSpace: "nowrap",
      }}
      variant="caption"
    >
      {label}
    </Typography>
  );
}
