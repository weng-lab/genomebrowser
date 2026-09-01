"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { hg38, type GenomicRegion, type Highlight } from "@weng-lab/genomebrowser";
import { Cytobands, type CytobandColors } from "@weng-lab/genomebrowser-ui";
import { parseCytobands, readCytobands, type Cytoband } from "@weng-lab/genomic-reader";
import { useEffect, useRef, useState } from "react";

type SourceMode = "bundled" | "text" | "delayed" | "malformed" | "custom";
type RequestStatus = "idle" | "loading" | "success" | "error" | "aborted";

type RequestState = {
  status: RequestStatus;
  requestId?: number;
  startedAt?: number;
  elapsedMs?: number;
  count: number;
  error?: string;
};

type LogEntry = {
  id: number;
  time: string;
  message: string;
};

const bundledUrl = "/data/hg38.cytoBand.txt";
const defaultText = [
  "chr1\t0\t30000000\tp36\tgneg",
  "chr1\t30000000\t60000000\tp21\tgpos50",
  "chr1\t60000000\t90000000\tp11\tacen",
  "chr1\t90000000\t120000000\tq11\tacen",
  "chr1\t120000000\t180000000\tq21\tgvar",
  "chr1\t180000000\t260000000\tq44\tgpos100",
].join("\n");
const mitochondrialText = [
  "chrM\t0\t5000\t\tgneg",
  "chrM\t5000\t10500\t\tgpos75",
  "chrM\t10500\t16569\t\tgneg",
].join("\n");
const malformedText = "chr1\t0\t100\tmissing-stain";
const clippingText = [
  "chrClip\t0\t20\tleft\tgneg",
  "chrClip\t20\t60\tmiddle\tgpos50",
  "chrClip\t60\t140\tright\tgvar",
].join("\n");

const defaultHighlights = JSON.stringify(
  [
    {
      id: "example-locus",
      region: { chromosome: "chr1", start: 45_000_000, end: 70_000_000 },
      color: "#ef6c00",
      opacity: 0.65,
    },
  ] satisfies readonly Highlight[],
  null,
  2,
);

const defaultColors: CytobandColors = {
  negative: "#ffffff",
  positive: "#111111",
  variable: "#8c8c8c",
  stalk: "#d95f5f",
  centromere: "#9e2a2b",
  unknown: "#b8b8b8",
};

const sourceLabels: Record<SourceMode, string> = {
  bundled: "Bundled hg38 file",
  text: "Editable text",
  delayed: "Delayed valid fixture",
  malformed: "Malformed fixture",
  custom: "Custom URL",
};

function absoluteUrl(path: string) {
  return new URL(path, window.location.href).href;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function numericValue(value: string) {
  return value === "" ? 0 : Number(value);
}

export function CytobandHarness() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("bundled");
  const [text, setText] = useState(defaultText);
  const [customUrl, setCustomUrl] = useState("");
  const [delayMs, setDelayMs] = useState(2500);
  const [bands, setBands] = useState<readonly Cytoband[]>([]);
  const [request, setRequest] = useState<RequestState>({ status: "idle", count: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [clock, setClock] = useState(() => performance.now());
  const [scenarioNote, setScenarioNote] = useState(
    "Load the bundled hg38 file, then adjust renderer inputs independently.",
  );

  const [chromosome, setChromosome] = useState("chr1");
  const [chromosomeLength, setChromosomeLength] = useState(hg38.chromosomes.chr1);
  const [width, setWidth] = useState(760);
  const [height, setHeight] = useState(36);
  const [showCurrentRegion, setShowCurrentRegion] = useState(true);
  const [regionChromosome, setRegionChromosome] = useState("chr1");
  const [regionStart, setRegionStart] = useState(45_000_000);
  const [regionEnd, setRegionEnd] = useState(70_000_000);
  const [highlightsText, setHighlightsText] = useState(defaultHighlights);
  const [colors, setColors] = useState<CytobandColors>(defaultColors);

  const controllerRef = useRef<AbortController | undefined>(undefined);
  const requestIdRef = useRef(0);
  const logIdRef = useRef(0);

  useEffect(() => {
    if (request.status !== "loading") return;
    const timer = window.setInterval(() => setClock(performance.now()), 100);
    return () => window.clearInterval(timer);
  }, [request.status]);

  useEffect(() => () => controllerRef.current?.abort("Harness unmounted"), []);

  function appendLog(message: string) {
    const entry: LogEntry = {
      id: ++logIdRef.current,
      time: new Date().toLocaleTimeString(),
      message,
    };
    setLog((current) => [...current.slice(-19), entry]);
  }

  async function handleLoad() {
    const previousController = controllerRef.current;
    if (previousController && !previousController.signal.aborted) {
      previousController.abort("Superseded by a repeated load");
      appendLog("Active request superseded by a repeated Load action");
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const startedAt = performance.now();
    controllerRef.current = controller;
    setClock(startedAt);
    setRequest({ status: "loading", requestId, startedAt, count: bands.length });
    appendLog(`#${requestId} idle → loading (${sourceLabels[sourceMode]})`);

    try {
      const nextBands =
        sourceMode === "text"
          ? parseCytobands(text)
          : await readCytobands({
              url: absoluteUrl(getSourceUrl(sourceMode, customUrl, delayMs)),
              signal: controller.signal,
            });
      const elapsedMs = performance.now() - startedAt;
      if (requestId !== requestIdRef.current) {
        appendLog(`#${requestId} result ignored after a newer transition`);
        return;
      }
      setBands(nextBands);
      setRequest({ status: "success", requestId, elapsedMs, count: nextBands.length });
      appendLog(`#${requestId} loading → success (${nextBands.length} records)`);
    } catch (error) {
      const elapsedMs = performance.now() - startedAt;
      if (requestId !== requestIdRef.current) {
        appendLog(`#${requestId} rejection ignored after a newer transition`);
        return;
      }
      if (controller.signal.aborted) {
        setRequest({ status: "aborted", requestId, elapsedMs, count: bands.length });
        appendLog(`#${requestId} loading → aborted`);
      } else {
        const message = errorMessage(error);
        setRequest({
          status: "error",
          requestId,
          elapsedMs,
          count: bands.length,
          error: message,
        });
        appendLog(`#${requestId} loading → error (${message})`);
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = undefined;
    }
  }

  function handleAbort() {
    const controller = controllerRef.current;
    if (!controller || controller.signal.aborted) return;
    controller.abort("Abort requested in harness");
    appendLog(`#${request.requestId ?? "?"} Abort requested`);
  }

  function handleClear() {
    controllerRef.current?.abort("Harness cleared");
    controllerRef.current = undefined;
    requestIdRef.current += 1;
    setBands([]);
    setRequest({ status: "idle", count: 0 });
    setLog([]);
    appendLog("Cleared records and request state");
  }

  function handleSourceChange(event: SelectChangeEvent<SourceMode>) {
    setSourceMode(event.target.value as SourceMode);
    setScenarioNote(`${sourceLabels[event.target.value as SourceMode]} selected.`);
  }

  function useHg38Length() {
    const assemblyLength = hg38.chromosomes[chromosome];
    if (assemblyLength !== undefined) {
      setChromosomeLength(assemblyLength);
      appendLog(`Renderer length set from hg38.${chromosome}`);
    } else {
      appendLog(`hg38 has no chromosome named ${chromosome}`);
    }
  }

  function applyPreset(preset: string) {
    if (preset === "chr1") {
      setSourceMode("bundled");
      setChromosome("chr1");
      setChromosomeLength(hg38.chromosomes.chr1);
      setRegionChromosome("chr1");
      setRegionStart(45_000_000);
      setRegionEnd(70_000_000);
      setHighlightsText(defaultHighlights);
      setScenarioNote("Load the bundled file to render hg38 chr1 with a region and highlight.");
    } else if (preset === "chrM") {
      setSourceMode("text");
      setText(mitochondrialText);
      setChromosome("chrM");
      setChromosomeLength(hg38.chromosomes.chrM);
      setRegionChromosome("chrM");
      setRegionStart(3000);
      setRegionEnd(8000);
      setHighlightsText("[]");
      setScenarioNote("Load editable text containing valid chrM records with empty band names.");
    } else if (preset === "clipping") {
      setSourceMode("text");
      setText(clippingText);
      setChromosome("chrClip");
      setChromosomeLength(100);
      setRegionChromosome("chrClip");
      setRegionStart(-15);
      setRegionEnd(115);
      setHighlightsText(
        JSON.stringify(
          [
            { id: "left-clip", region: { start: -20, end: 10 }, color: "#1565c0" },
            { id: "right-clip", region: { start: 90, end: 125 }, color: "#ef6c00" },
          ] satisfies readonly Highlight[],
          null,
          2,
        ),
      );
      setScenarioNote("Load to clip the final band, region, and highlights to a length of 100.");
    } else if (preset === "no-match") {
      setSourceMode("text");
      setText(defaultText);
      setChromosome("chrNoMatch");
      setChromosomeLength(100);
      setRegionChromosome("chrNoMatch");
      setHighlightsText("[]");
      setScenarioNote(
        "Load chr1 records while rendering chrNoMatch; the ideogram should be empty.",
      );
    } else if (preset === "parse-failure") {
      setSourceMode("text");
      setText(malformedText);
      setScenarioNote("Load malformed editable text to expose parseCytobands failure details.");
    } else if (preset === "cancellation") {
      setSourceMode("delayed");
      setDelayMs(5000);
      setScenarioNote("Select Load, then Abort before the five-second fixture responds.");
    } else {
      setSourceMode("delayed");
      setDelayMs(2500);
      setScenarioNote(
        "Select Load twice quickly. The second request aborts and supersedes the first; inspect the log.",
      );
    }
    appendLog(`Applied ${preset} preset`);
  }

  let highlights: readonly Highlight[] = [];
  let highlightsError: string | undefined;
  try {
    const parsed: unknown = JSON.parse(highlightsText);
    if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
    highlights = parsed as Highlight[];
  } catch (error) {
    highlightsError = errorMessage(error);
  }

  const currentRegion: GenomicRegion | undefined = showCurrentRegion
    ? { chromosome: regionChromosome, start: regionStart, end: regionEnd }
    : undefined;
  const displayedElapsed =
    request.status === "loading" && request.startedAt !== undefined
      ? clock - request.startedAt
      : request.elapsedMs;

  return (
    <Box component="main" sx={{ maxWidth: 1440, mx: "auto", p: { xs: 1, sm: 2 } }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography component="h1" variant="h5">
            Cytobands disposable harness
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Exercises the public reader, parser, hg38 assembly, and Cytobands renderer APIs.
          </Typography>
        </Box>

        <Paper component="section" variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            <Typography component="h2" variant="subtitle1">
              Scenario presets
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
              <Button size="small" variant="outlined" onClick={() => applyPreset("chr1")}>
                chr1
              </Button>
              <Button size="small" variant="outlined" onClick={() => applyPreset("chrM")}>
                chrM empty names
              </Button>
              <Button size="small" variant="outlined" onClick={() => applyPreset("clipping")}>
                Clipping
              </Button>
              <Button size="small" variant="outlined" onClick={() => applyPreset("no-match")}>
                No matching chromosome
              </Button>
              <Button size="small" variant="outlined" onClick={() => applyPreset("parse-failure")}>
                Parse failure
              </Button>
              <Button size="small" variant="outlined" onClick={() => applyPreset("cancellation")}>
                Cancellation
              </Button>
              <Button size="small" variant="outlined" onClick={() => applyPreset("repeated")}>
                Repeated loads
              </Button>
            </Stack>
            <Typography aria-live="polite" color="text.secondary" variant="caption">
              {scenarioNote}
            </Typography>
          </Stack>
        </Paper>

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
          <Paper component="section" variant="outlined" sx={{ minWidth: 0, p: 1.5 }}>
            <Stack spacing={1.25}>
              <Typography component="h2" variant="subtitle1">
                Data source
              </Typography>
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { sm: "220px 1fr" } }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="cytoband-source-label">Source</InputLabel>
                  <Select<SourceMode>
                    label="Source"
                    labelId="cytoband-source-label"
                    value={sourceMode}
                    onChange={handleSourceChange}
                  >
                    {Object.entries(sourceLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {sourceMode === "custom" ? (
                  <TextField
                    fullWidth
                    label="Custom cytoband URL"
                    placeholder="https://example.org/cytoBand.txt"
                    size="small"
                    value={customUrl}
                    onChange={(event) => setCustomUrl(event.target.value)}
                  />
                ) : sourceMode === "delayed" || sourceMode === "malformed" ? (
                  <TextField
                    fullWidth
                    inputProps={{ min: 0, max: 10000, step: 100 }}
                    label="Fixture delay (ms)"
                    size="small"
                    type="number"
                    value={delayMs}
                    onChange={(event) => setDelayMs(numericValue(event.target.value))}
                  />
                ) : (
                  <TextField
                    fullWidth
                    InputProps={{ readOnly: true }}
                    label="Resolved source"
                    size="small"
                    value={sourceMode === "bundled" ? bundledUrl : "parseCytobands(editable text)"}
                  />
                )}
              </Box>
              {sourceMode === "text" ? (
                <TextField
                  fullWidth
                  label="Cytoband tab-separated text"
                  minRows={7}
                  multiline
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              ) : null}
              <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
                <Button variant="contained" onClick={() => void handleLoad()}>
                  Load
                </Button>
                <Button
                  disabled={request.status !== "loading"}
                  variant="outlined"
                  onClick={handleAbort}
                >
                  Abort
                </Button>
                <Button color="inherit" variant="outlined" onClick={handleClear}>
                  Clear
                </Button>
              </Stack>
              <Divider />
              <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
                <Chip
                  color={statusColor(request.status)}
                  label={`Status: ${request.status}`}
                  size="small"
                  variant={request.status === "idle" ? "outlined" : "filled"}
                />
                <Chip
                  label={`Request: ${request.requestId ?? "—"}`}
                  size="small"
                  variant="outlined"
                />
                <Chip label={`Records: ${request.count}`} size="small" variant="outlined" />
                <Chip
                  label={`Timing: ${displayedElapsed === undefined ? "—" : `${displayedElapsed.toFixed(1)} ms`}`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
              <Box aria-live="polite" role="status" sx={{ minHeight: 20 }}>
                {request.error ? (
                  <Typography color="error" sx={{ overflowWrap: "anywhere" }} variant="body2">
                    {request.error}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Paper>

          <Paper component="section" variant="outlined" sx={{ minWidth: 0, p: 1.5 }}>
            <Stack spacing={1}>
              <Typography component="h2" variant="subtitle1">
                Request transitions
              </Typography>
              <Box
                aria-label="Request transition log"
                component="ol"
                sx={{
                  bgcolor: "action.hover",
                  fontFamily: "monospace",
                  fontSize: 12,
                  m: 0,
                  minHeight: 108,
                  overflow: "auto",
                  pl: 3.5,
                  pr: 1,
                  py: 1,
                }}
              >
                {log.length === 0 ? <li>No transitions yet</li> : null}
                {log.map((entry) => (
                  <li key={entry.id}>{`${entry.time} — ${entry.message}`}</li>
                ))}
              </Box>
              <Typography component="h2" variant="subtitle1">
                Raw records
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: "action.hover",
                  fontSize: 11,
                  m: 0,
                  maxHeight: 260,
                  minHeight: 108,
                  overflow: "auto",
                  p: 1,
                  whiteSpace: "pre-wrap",
                }}
              >
                {bands.length === 0 ? "[]" : JSON.stringify(bands, null, 2)}
              </Box>
            </Stack>
          </Paper>
        </Box>

        <Paper component="section" variant="outlined" sx={{ minWidth: 0, p: 1.5 }}>
          <Stack spacing={1.25}>
            <Typography component="h2" variant="subtitle1">
              Renderer controls
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
              }}
            >
              <TextField
                label="Chromosome"
                size="small"
                value={chromosome}
                onChange={(event) => setChromosome(event.target.value)}
              />
              <Stack direction="row" spacing={0.5}>
                <TextField
                  fullWidth
                  label="Chromosome length"
                  size="small"
                  type="number"
                  value={chromosomeLength}
                  onChange={(event) => setChromosomeLength(numericValue(event.target.value))}
                />
                <Button
                  aria-label="Use chromosome length from hg38"
                  size="small"
                  onClick={useHg38Length}
                >
                  hg38
                </Button>
              </Stack>
              <TextField
                label="Width (px)"
                size="small"
                type="number"
                value={width}
                onChange={(event) => setWidth(numericValue(event.target.value))}
              />
              <TextField
                label="Height (px)"
                size="small"
                type="number"
                value={height}
                onChange={(event) => setHeight(numericValue(event.target.value))}
              />
            </Box>

            <Box sx={{ overflowX: "auto", py: 0.5 }}>
              <Cytobands
                bands={bands}
                chromosome={chromosome}
                chromosomeLength={chromosomeLength}
                colors={colors}
                currentRegion={currentRegion}
                height={height}
                highlights={highlights}
                onHighlightClick={(highlight) => appendLog(`Activated highlight ${highlight.id}`)}
                renderHighlightTooltip={(highlight) => (
                  <text>{`${highlight.id}: ${highlight.region.start}–${highlight.region.end}`}</text>
                )}
                width={width}
              />
            </Box>

            <Divider />
            <Typography component="h3" variant="subtitle2">
              Current region
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showCurrentRegion}
                    onChange={(event) => setShowCurrentRegion(event.target.checked)}
                  />
                }
                label="Show current region"
              />
              <TextField
                disabled={!showCurrentRegion}
                label="Region chromosome"
                size="small"
                value={regionChromosome}
                onChange={(event) => setRegionChromosome(event.target.value)}
              />
              <TextField
                disabled={!showCurrentRegion}
                label="Region start"
                size="small"
                type="number"
                value={regionStart}
                onChange={(event) => setRegionStart(numericValue(event.target.value))}
              />
              <TextField
                disabled={!showCurrentRegion}
                label="Region end"
                size="small"
                type="number"
                value={regionEnd}
                onChange={(event) => setRegionEnd(numericValue(event.target.value))}
              />
            </Stack>

            <TextField
              error={highlightsError !== undefined}
              fullWidth
              helperText={
                highlightsError ?? "Array of public Highlight objects; changes update live."
              }
              label="Highlights (JSON)"
              minRows={4}
              multiline
              value={highlightsText}
              onChange={(event) => setHighlightsText(event.target.value)}
            />

            <Typography component="h3" variant="subtitle2">
              Stain colors
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  lg: "repeat(6, 1fr)",
                },
              }}
            >
              {(Object.keys(colors) as (keyof CytobandColors)[]).map((name) => (
                <TextField
                  key={name}
                  label={name}
                  size="small"
                  type="color"
                  value={colors[name]}
                  onChange={(event) =>
                    setColors((current) => ({ ...current, [name]: event.target.value }))
                  }
                />
              ))}
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

function getSourceUrl(mode: Exclude<SourceMode, "text">, customUrl: string, delayMs: number) {
  if (mode === "bundled") return bundledUrl;
  if (mode === "custom") return customUrl;
  const query = new URLSearchParams({
    delay: String(delayMs),
    mode: mode === "malformed" ? "malformed" : "valid",
  });
  return `/cytobands-harness/fixture?${query}`;
}

function statusColor(
  status: RequestStatus,
): "default" | "primary" | "success" | "error" | "warning" {
  if (status === "loading") return "primary";
  if (status === "success") return "success";
  if (status === "error") return "error";
  if (status === "aborted") return "warning";
  return "default";
}
