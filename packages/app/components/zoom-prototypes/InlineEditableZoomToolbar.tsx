// THROWAWAY_UI: disposable inline zoom and editable-region prototype.
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import ButtonGroup from "@mui/material/ButtonGroup";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { BrowserNavigationButton } from "@weng-lab/genomebrowser-ui";
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import { formatSpan, type ZoomPrototypeProps } from "./shared";

const zoomAmounts = [1.5, 2, 3, 5, 10] as const;
const panFractions = [0.25, 0.5, 1] as const;
type ZoomAmount = (typeof zoomAmounts)[number];
type PanFraction = (typeof panFractions)[number];
type EditableSegment = "chromosome" | "start" | "end";

export function InlineEditableZoomToolbar({ useBrowserStore }: ZoomPrototypeProps) {
  const chromosome = useBrowserStore((state) => state.region.chromosome);
  const start = useBrowserStore((state) => state.region.start);
  const end = useBrowserStore((state) => state.region.end);
  const chromosomes = useBrowserStore((state) => state.assembly.chromosomes);
  const chromosomeLength = chromosomes[chromosome];
  const span = end - start;
  const [amount, setAmount] = useState<ZoomAmount>(2);
  const [panFraction, setPanFraction] = useState<PanFraction>(0.5);
  const [amountAnchor, setAmountAnchor] = useState<HTMLButtonElement | null>(null);
  const [panAnchor, setPanAnchor] = useState<HTMLButtonElement | null>(null);
  const [activeSegment, setActiveSegment] = useState<EditableSegment | null>(null);
  const [draftCoordinate, setDraftCoordinate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const cancelNextBlur = useRef(false);
  const amountMenuId = useId();
  const amountButtonId = useId();
  const panMenuId = useId();
  const panButtonId = useId();

  const usable =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    end > start &&
    end <= chromosomeLength;

  function beginCoordinateEdit(segment: "start" | "end") {
    cancelNextBlur.current = false;
    setDraftCoordinate(String(segment === "start" ? start : end));
    setEditError(null);
    setActiveSegment(segment);
  }

  function cancelCoordinateEdit() {
    cancelNextBlur.current = true;
    setEditError(null);
    setActiveSegment(null);
  }

  function commitCoordinate(segment: "start" | "end") {
    if (cancelNextBlur.current) {
      cancelNextBlur.current = false;
      return;
    }

    const coordinate = Number(draftCoordinate.replaceAll(",", "").trim());
    const nextStart = segment === "start" ? coordinate : start;
    const nextEnd = segment === "end" ? coordinate : end;

    if (!Number.isSafeInteger(coordinate)) {
      setEditError("Enter a whole-number coordinate.");
      return;
    }
    if (nextStart < 0 || nextStart >= nextEnd) {
      setEditError("Start must be at least 0 and less than end.");
      return;
    }
    if (nextEnd > chromosomeLength) {
      setEditError(`End must not exceed ${chromosomeLength.toLocaleString()}.`);
      return;
    }

    useBrowserStore.getState().setRegion({ chromosome, start: nextStart, end: nextEnd });
    setEditError(null);
    setActiveSegment(null);
  }

  function handleCoordinateKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    segment: "start" | "end",
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitCoordinate(segment);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelCoordinateEdit();
    }
  }

  function changeChromosome(nextChromosome: string) {
    const nextChromosomeLength = chromosomes[nextChromosome];
    const nextSpan = Math.min(span, nextChromosomeLength);
    const nextStart = Math.min(Math.max(0, start), nextChromosomeLength - nextSpan);

    useBrowserStore.getState().setRegion({
      chromosome: nextChromosome,
      start: nextStart,
      end: nextStart + nextSpan,
    });
    setActiveSegment(null);
    setEditError(null);
  }

  function openAmountMenu(event: MouseEvent<HTMLButtonElement>) {
    setAmountAnchor(event.currentTarget);
  }

  function closeAmountMenu() {
    setAmountAnchor(null);
  }

  function openPanMenu(event: MouseEvent<HTMLButtonElement>) {
    setPanAnchor(event.currentTarget);
  }

  function closePanMenu() {
    setPanAnchor(null);
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        aria-label="Genome browser navigation"
        role="toolbar"
        variant="outlined"
        sx={{
          alignItems: "center",
          display: "grid",
          gap: { xs: 1, sm: 1.5 },
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "auto minmax(0, 1fr) auto" },
          px: 1,
          py: 0.75,
          width: "100%",
        }}
      >
        <ButtonGroup
          aria-label={`Pan by ${formatPanFraction(panFraction)}`}
          size="small"
          variant="outlined"
          sx={{ justifySelf: { xs: "stretch", md: "start" } }}
        >
          <BrowserNavigationButton
            action={{ type: "pan", fraction: -panFraction }}
            aria-label={`Pan left by ${formatPanFraction(panFraction)}`}
            browserStore={useBrowserStore}
            startIcon={<ArrowLeftIcon fontSize="small" />}
            sx={{ flex: { xs: 1, md: "initial" }, textTransform: "none", whiteSpace: "nowrap" }}
          >
            Pan left
          </BrowserNavigationButton>
          <Button
            id={panButtonId}
            aria-controls={panAnchor ? panMenuId : undefined}
            aria-expanded={panAnchor ? "true" : undefined}
            aria-haspopup="menu"
            aria-label={`Choose pan distance. Current distance ${formatPanFraction(panFraction)}`}
            disabled={!usable}
            endIcon={<ArrowDropDownIcon fontSize="small" />}
            sx={{ minWidth: 112, textTransform: "none" }}
            onClick={openPanMenu}
          >
            {formatPanFraction(panFraction)}
          </Button>
          <BrowserNavigationButton
            action={{ type: "pan", fraction: panFraction }}
            aria-label={`Pan right by ${formatPanFraction(panFraction)}`}
            browserStore={useBrowserStore}
            endIcon={<ArrowRightIcon fontSize="small" />}
            sx={{ flex: { xs: 1, md: "initial" }, textTransform: "none", whiteSpace: "nowrap" }}
          >
            Pan right
          </BrowserNavigationButton>
        </ButtonGroup>

        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <Box
            aria-label="Current region. Select chromosome, start, or end to edit."
            role="group"
            sx={{ alignItems: "center", display: "inline-flex", minWidth: 0 }}
          >
            {activeSegment === "chromosome" ? (
              <Select
                autoFocus
                aria-label="Chromosome"
                size="small"
                value={chromosome}
                onChange={(event) => changeChromosome(event.target.value)}
                onClose={() => setActiveSegment(null)}
                sx={{ minWidth: 88, "& .MuiSelect-select": { py: 0.5 } }}
              >
                {Object.keys(chromosomes).map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <RegionSegment
                label={`Edit chromosome ${chromosome}`}
                value={chromosome}
                onClick={() => {
                  setEditError(null);
                  setActiveSegment("chromosome");
                }}
              />
            )}

            <Typography aria-hidden color="text.secondary" component="span">
              :
            </Typography>

            {activeSegment === "start" ? (
              <CoordinateInput
                error={Boolean(editError)}
                label="Region start"
                value={draftCoordinate}
                onBlur={() => commitCoordinate("start")}
                onChange={setDraftCoordinate}
                onKeyDown={(event) => handleCoordinateKeyDown(event, "start")}
              />
            ) : (
              <RegionSegment
                label={`Edit region start ${start.toLocaleString()}`}
                value={start.toLocaleString()}
                onClick={() => beginCoordinateEdit("start")}
              />
            )}

            <Typography aria-hidden color="text.secondary" component="span" sx={{ px: 0.25 }}>
              –
            </Typography>

            {activeSegment === "end" ? (
              <CoordinateInput
                error={Boolean(editError)}
                label="Region end"
                value={draftCoordinate}
                onBlur={() => commitCoordinate("end")}
                onChange={setDraftCoordinate}
                onKeyDown={(event) => handleCoordinateKeyDown(event, "end")}
              />
            ) : (
              <RegionSegment
                label={`Edit region end ${end.toLocaleString()}`}
                value={end.toLocaleString()}
                onClick={() => beginCoordinateEdit("end")}
              />
            )}
          </Box>

          <Typography
            aria-live="polite"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
            variant="body2"
          >
            {formatSpan(span)} in view
          </Typography>
        </Box>

        <ButtonGroup
          aria-label={`Zoom using a ${amount}× step`}
          size="small"
          variant="outlined"
          sx={{ justifySelf: { xs: "stretch", md: "end" } }}
        >
          <Button
            aria-label={`Zoom out ${amount}×`}
            disabled={!usable || span >= chromosomeLength}
            startIcon={<ZoomOutIcon fontSize="small" />}
            sx={{ flex: { xs: 1, md: "initial" }, textTransform: "none", whiteSpace: "nowrap" }}
            onClick={() => useBrowserStore.getState().zoom(amount)}
          >
            Zoom out
          </Button>
          <Button
            id={amountButtonId}
            aria-controls={amountAnchor ? amountMenuId : undefined}
            aria-expanded={amountAnchor ? "true" : undefined}
            aria-haspopup="menu"
            aria-label={`Choose zoom magnitude. Current magnitude ${amount}×`}
            disabled={!usable}
            endIcon={<ArrowDropDownIcon fontSize="small" />}
            sx={{ minWidth: 76, textTransform: "none" }}
            onClick={openAmountMenu}
          >
            {amount}×
          </Button>
          <Button
            aria-label={`Zoom in ${amount}×`}
            disabled={!usable || span <= 1}
            endIcon={<ZoomInIcon fontSize="small" />}
            sx={{ flex: { xs: 1, md: "initial" }, textTransform: "none", whiteSpace: "nowrap" }}
            onClick={() => useBrowserStore.getState().zoom(1 / amount)}
          >
            Zoom in
          </Button>
        </ButtonGroup>
      </Paper>

      {editError ? (
        <Typography color="error" sx={{ mt: 0.5, px: 1 }} variant="caption">
          {editError}
        </Typography>
      ) : null}

      <Menu
        id={amountMenuId}
        anchorEl={amountAnchor}
        open={Boolean(amountAnchor)}
        slotProps={{ list: { "aria-labelledby": amountButtonId, dense: true } }}
        onClose={closeAmountMenu}
      >
        {zoomAmounts.map((option) => (
          <MenuItem
            key={option}
            aria-checked={option === amount}
            role="menuitemradio"
            selected={option === amount}
            onClick={() => {
              setAmount(option);
              closeAmountMenu();
            }}
          >
            {option}×
          </MenuItem>
        ))}
      </Menu>

      <Menu
        id={panMenuId}
        anchorEl={panAnchor}
        open={Boolean(panAnchor)}
        slotProps={{ list: { "aria-labelledby": panButtonId, dense: true } }}
        onClose={closePanMenu}
      >
        {panFractions.map((fraction) => (
          <MenuItem
            key={fraction}
            aria-checked={fraction === panFraction}
            role="menuitemradio"
            selected={fraction === panFraction}
            onClick={() => {
              setPanFraction(fraction);
              closePanMenu();
            }}
          >
            {formatPanFraction(fraction)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

function formatPanFraction(fraction: PanFraction) {
  if (fraction === 0.25) return "¼ viewport";
  if (fraction === 0.5) return "½ viewport";
  return "1 viewport";
}

function RegionSegment({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <Tooltip title={label}>
      <ButtonBase
        aria-label={label}
        onClick={onClick}
        sx={{
          borderRadius: 1,
          fontVariantNumeric: "tabular-nums",
          px: 0.5,
          py: 0.25,
          "&:hover, &:focus-visible": { bgcolor: "action.hover" },
        }}
      >
        <Typography component="span" variant="body2">
          {value}
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
}

function CoordinateInput({
  error,
  label,
  onBlur,
  onChange,
  onKeyDown,
  value,
}: {
  error: boolean;
  label: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <TextField
      autoFocus
      error={error}
      hiddenLabel
      size="small"
      slotProps={{ htmlInput: { "aria-label": label, inputMode: "numeric" } }}
      value={value}
      variant="outlined"
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      sx={{ width: 128, "& .MuiInputBase-input": { py: 0.5 } }}
    />
  );
}
