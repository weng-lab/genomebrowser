// THROWAWAY_UI: disposable variations on the split-button zoom concept.
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { Fragment, useId, useState, type MouseEvent } from "react";
import { formatSpan, type ZoomPrototypeProps } from "./shared";

const zoomAmounts = [1.5, 3, 10] as const;

export function SplitZoomCoordinateStack({ useBrowserStore }: ZoomPrototypeProps) {
  const chromosome = useBrowserStore((state) => state.region.chromosome);
  const start = useBrowserStore((state) => state.region.start);
  const end = useBrowserStore((state) => state.region.end);
  const chromosomeLength = useBrowserStore(
    (state) => state.assembly.chromosomes[state.region.chromosome],
  );

  const span = end - start;
  const hasValidRegion =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    span > 0 &&
    start >= 0 &&
    end <= chromosomeLength;

  return (
    <Box
      aria-label="Zoom controls and viewport"
      role="group"
      sx={{
        display: "inline-grid",
        maxWidth: "100%",
        rowGap: 0.75,
        width: 360,
      }}
    >
      <Typography
        aria-live="polite"
        sx={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
        variant="body2"
      >
        {chromosome}:{start.toLocaleString()}–{end.toLocaleString()}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <CoordinateZoomAction
          direction="out"
          disabled={!hasValidRegion || span >= chromosomeLength}
          useBrowserStore={useBrowserStore}
        />
        <CoordinateZoomAction
          direction="in"
          disabled={!hasValidRegion || span <= 1}
          useBrowserStore={useBrowserStore}
        />
      </Box>
      <Box sx={{ alignItems: "baseline", display: "flex", gap: 0.75, justifySelf: "end" }}>
        <Typography color="text.secondary" variant="caption">
          Viewed span
        </Typography>
        <Typography
          aria-live="polite"
          sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}
          variant="body2"
        >
          {formatSpan(span)}
        </Typography>
      </Box>
    </Box>
  );
}

function CoordinateZoomAction({
  direction,
  disabled,
  useBrowserStore,
}: {
  direction: "in" | "out";
  disabled: boolean;
  useBrowserStore: ZoomPrototypeProps["useBrowserStore"];
}) {
  const [anchorElement, setAnchorElement] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  const menuId = `${id}-coordinate-menu`;
  const menuButtonId = `${id}-coordinate-button`;
  const label = direction === "out" ? "Zoom out" : "Zoom in";
  const Icon = direction === "out" ? ZoomOutIcon : ZoomInIcon;

  function zoom(amount: number) {
    useBrowserStore.getState().zoom(direction === "out" ? amount : 1 / amount);
  }

  function openMenu(event: MouseEvent<HTMLButtonElement>) {
    setAnchorElement(event.currentTarget);
  }

  function closeMenu() {
    setAnchorElement(null);
  }

  return (
    <>
      <ButtonGroup
        aria-label={label}
        disabled={disabled}
        size="small"
        sx={{ width: "100%" }}
        variant="outlined"
      >
        <Button
          aria-label={`${label} 1.5×`}
          startIcon={<Icon fontSize="small" />}
          sx={{ flex: 1, textTransform: "none", whiteSpace: "nowrap" }}
          onClick={() => zoom(1.5)}
        >
          {label} 1.5×
        </Button>
        <Button
          id={menuButtonId}
          aria-controls={anchorElement ? menuId : undefined}
          aria-expanded={anchorElement ? "true" : undefined}
          aria-haspopup="menu"
          aria-label={`Choose ${label.toLowerCase()} amount`}
          sx={{ minWidth: 34, px: 0.5 }}
          onClick={openMenu}
        >
          <ArrowDropDownIcon fontSize="small" />
        </Button>
      </ButtonGroup>
      <Menu
        id={menuId}
        anchorEl={anchorElement}
        open={Boolean(anchorElement)}
        slotProps={{ list: { "aria-labelledby": menuButtonId, dense: true } }}
        onClose={closeMenu}
      >
        {zoomAmounts.map((amount) => (
          <MenuItem
            key={amount}
            aria-label={`${label} ${amount}×`}
            disabled={disabled}
            sx={{ minWidth: 156, py: 0.5 }}
            onClick={() => {
              zoom(amount);
              closeMenu();
            }}
          >
            <Typography sx={{ fontVariantNumeric: "tabular-nums" }} variant="body2">
              {label} {amount}×
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function SplitZoomMagnitudeRail({ useBrowserStore }: ZoomPrototypeProps) {
  const start = useBrowserStore((state) => state.region.start);
  const end = useBrowserStore((state) => state.region.end);
  const chromosomeLength = useBrowserStore(
    (state) => state.assembly.chromosomes[state.region.chromosome],
  );

  const span = end - start;
  const hasValidRegion =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    span > 0 &&
    start >= 0 &&
    end <= chromosomeLength;
  const zoomOutDisabled = !hasValidRegion || span >= chromosomeLength;
  const zoomInDisabled = !hasValidRegion || span <= 1;

  return (
    <Box
      aria-label="Zoom by magnitude"
      role="group"
      sx={{
        alignItems: "stretch",
        display: "inline-grid",
        gap: 0.5,
        gridTemplateColumns: "68px repeat(2, minmax(112px, 1fr))",
      }}
    >
      <Typography
        color="text.secondary"
        sx={{ alignSelf: "end", pb: 0.5, textAlign: "center" }}
        variant="caption"
      >
        Magnitude
      </Typography>
      <Box sx={{ textAlign: "center" }}>
        <Typography component="div" sx={{ fontWeight: 600, lineHeight: 1.2 }} variant="body2">
          Zoom out
        </Typography>
        <Typography color="text.secondary" component="div" variant="caption">
          More context
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography component="div" sx={{ fontWeight: 600, lineHeight: 1.2 }} variant="body2">
          Zoom in
        </Typography>
        <Typography color="text.secondary" component="div" variant="caption">
          More detail
        </Typography>
      </Box>

      {zoomAmounts.map((amount) => (
        <Fragment key={amount}>
          <Box
            sx={{
              alignItems: "center",
              borderLeft: 2,
              borderLeftColor: "divider",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
              variant="body2"
            >
              {amount}×
            </Typography>
          </Box>
          <Button
            aria-label={`Zoom out ${amount}× — more context`}
            disabled={zoomOutDisabled}
            size="small"
            startIcon={<ZoomOutIcon fontSize="small" />}
            sx={{ textTransform: "none" }}
            variant="outlined"
            onClick={() => useBrowserStore.getState().zoom(amount)}
          >
            Out
          </Button>
          <Button
            aria-label={`Zoom in ${amount}× — more detail`}
            disabled={zoomInDisabled}
            size="small"
            startIcon={<ZoomInIcon fontSize="small" />}
            sx={{ textTransform: "none" }}
            variant="outlined"
            onClick={() => useBrowserStore.getState().zoom(1 / amount)}
          >
            In
          </Button>
        </Fragment>
      ))}
    </Box>
  );
}

export function SplitZoomUnifiedMenu({ useBrowserStore }: ZoomPrototypeProps) {
  const start = useBrowserStore((state) => state.region.start);
  const end = useBrowserStore((state) => state.region.end);
  const chromosomeLength = useBrowserStore(
    (state) => state.assembly.chromosomes[state.region.chromosome],
  );
  const [amount, setAmount] = useState<(typeof zoomAmounts)[number]>(1.5);
  const [anchorElement, setAnchorElement] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  const menuId = `${id}-unified-menu`;
  const menuButtonId = `${id}-unified-button`;

  const span = end - start;
  const hasValidRegion =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    span > 0 &&
    start >= 0 &&
    end <= chromosomeLength;
  const zoomOutDisabled = !hasValidRegion || span >= chromosomeLength;
  const zoomInDisabled = !hasValidRegion || span <= 1;

  function openMenu(event: MouseEvent<HTMLButtonElement>) {
    setAnchorElement(event.currentTarget);
  }

  function closeMenu() {
    setAnchorElement(null);
  }

  return (
    <Box aria-label="Zoom control" role="group" sx={{ display: "inline-flex" }}>
      <ButtonGroup aria-label={`Zoom using a ${amount}× step`} size="small" variant="outlined">
        <Button
          aria-label={`Zoom out ${amount}×`}
          disabled={zoomOutDisabled}
          startIcon={<ZoomOutIcon fontSize="small" />}
          sx={{ minWidth: 88, textTransform: "none" }}
          onClick={() => useBrowserStore.getState().zoom(amount)}
        >
          Out
        </Button>
        <Button
          id={menuButtonId}
          aria-controls={anchorElement ? menuId : undefined}
          aria-expanded={anchorElement ? "true" : undefined}
          aria-haspopup="menu"
          aria-label={`Choose zoom step. Current step ${amount}×`}
          disabled={!hasValidRegion}
          endIcon={<ArrowDropDownIcon fontSize="small" />}
          sx={{ minWidth: 98, textTransform: "none" }}
          onClick={openMenu}
        >
          Step {amount}×
        </Button>
        <Button
          aria-label={`Zoom in ${amount}×`}
          disabled={zoomInDisabled}
          endIcon={<ZoomInIcon fontSize="small" />}
          sx={{ minWidth: 88, textTransform: "none" }}
          onClick={() => useBrowserStore.getState().zoom(1 / amount)}
        >
          In
        </Button>
      </ButtonGroup>
      <Menu
        id={menuId}
        anchorEl={anchorElement}
        open={Boolean(anchorElement)}
        slotProps={{ list: { "aria-labelledby": menuButtonId, dense: true } }}
        onClose={closeMenu}
      >
        {zoomAmounts.map((option) => (
          <MenuItem
            key={option}
            aria-checked={option === amount}
            role="menuitemradio"
            selected={option === amount}
            sx={{ minWidth: 180, py: 0.5 }}
            onClick={() => {
              setAmount(option);
              closeMenu();
            }}
          >
            <Box>
              <Typography
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                variant="body2"
              >
                {option}× step
              </Typography>
              <Typography color="text.secondary" component="div" variant="caption">
                Use for zoom in or out
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
