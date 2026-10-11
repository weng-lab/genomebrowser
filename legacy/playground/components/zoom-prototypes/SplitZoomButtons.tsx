// THROWAWAY_UI: disposable zoom-control prototype.
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useId, useState, type MouseEvent } from "react";
import type { ZoomPrototypeProps } from "./shared";

const zoomAmounts = [1.5, 3, 10] as const;

export function SplitZoomButtons({ useBrowserStore }: ZoomPrototypeProps) {
  const region = useBrowserStore((state) => state.region);
  const assembly = useBrowserStore((state) => state.assembly);
  const chromosomeLength = assembly.chromosomes[region.chromosome];
  const span = region.end - region.start;
  const hasValidRegion =
    Number.isSafeInteger(chromosomeLength) &&
    Number.isSafeInteger(region.start) &&
    Number.isSafeInteger(region.end) &&
    span > 0 &&
    region.start >= 0 &&
    region.end <= chromosomeLength;

  return (
    <Box
      aria-label="Zoom controls"
      role="group"
      sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}
    >
      <SplitZoomControl
        direction="out"
        disabled={!hasValidRegion || span >= chromosomeLength}
        useBrowserStore={useBrowserStore}
      />
      <SplitZoomControl
        direction="in"
        disabled={!hasValidRegion || span <= 1}
        useBrowserStore={useBrowserStore}
      />
    </Box>
  );
}

function SplitZoomControl({
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
  const menuId = `${id}-menu`;
  const menuButtonId = `${id}-button`;
  const actionLabel = direction === "out" ? "Zoom out" : "Zoom in";

  function zoom(amount: number) {
    const factor = direction === "out" ? amount : 1 / amount;
    useBrowserStore.getState().zoom(factor);
  }

  function openMenu(event: MouseEvent<HTMLButtonElement>) {
    setAnchorElement(event.currentTarget);
  }

  function closeMenu() {
    setAnchorElement(null);
  }

  return (
    <>
      <ButtonGroup aria-label={actionLabel} size="small" variant="outlined">
        <Button
          aria-label={`${actionLabel} 1.5×`}
          disabled={disabled}
          sx={{ px: 1.25, textTransform: "none", whiteSpace: "nowrap" }}
          onClick={() => zoom(1.5)}
        >
          {actionLabel} 1.5×
        </Button>
        <Button
          id={menuButtonId}
          aria-controls={anchorElement ? menuId : undefined}
          aria-expanded={anchorElement ? "true" : undefined}
          aria-haspopup="menu"
          aria-label={`Choose ${actionLabel.toLowerCase()} amount`}
          disabled={disabled}
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
        {zoomAmounts.map((amount) => {
          const outcome = describeOutcome(direction, amount);
          return (
            <MenuItem
              key={amount}
              aria-label={`${actionLabel} ${amount}×. ${outcome}`}
              disabled={disabled}
              sx={{ minWidth: 190, py: 0.5 }}
              onClick={() => {
                zoom(amount);
                closeMenu();
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600 }} variant="body2">
                  {amount}×
                </Typography>
                <Typography color="text.secondary" display="block" variant="caption">
                  {outcome}
                </Typography>
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

function describeOutcome(direction: "in" | "out", amount: number) {
  if (direction === "out") return `Show ${amount}× the span`;
  if (amount === 1.5) return "Show 2/3 the span";
  return `Show 1/${amount} the span`;
}
