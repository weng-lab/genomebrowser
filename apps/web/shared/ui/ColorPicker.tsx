"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { readHex } from "./color";
import { formButtonSx } from "./FormCard";

/** Where the picker starts when it is given no color, or one it cannot read. */
export const defaultPickerColor = "#1f6fe5";

/** A color as hue (0–360), saturation (0–1), and brightness (0–1). */
type Hsv = { h: number; s: number; v: number };

type ColorPickerProps = {
  /** The six-digit hex color it starts at. */
  initialColor: string;
  /** The form's accessible name. */
  label: string;
  /** Called by Apply with a lowercase six-digit hex color. */
  onApply: (color: string) => void;
  /** Called by Cancel and Escape. */
  onCancel: () => void;
};

/**
 * Picks any color: a saturation and brightness area, a hue bar, and the color's hex code,
 * which can be typed. Nothing changes until Apply. Escape cancels it alone, not a form or
 * menu it opened from.
 */
export function ColorPicker({ initialColor, label, onApply, onCancel }: ColorPickerProps) {
  const [hsv, setHsv] = useState(() => hexToHsv(readHex(initialColor) ?? defaultPickerColor));
  const [hex, setHex] = useState(() => hsvToHex(hsv).toUpperCase());
  const [invalid, setInvalid] = useState(false);
  const typed = readHex(hex);
  const pick = (next: Hsv) => {
    setHsv(next);
    setHex(hsvToHex(next).toUpperCase());
    setInvalid(false);
  };

  return (
    <Box
      component="form"
      aria-label={label}
      // The hue slider's range input holds fractional hues, which the browser would refuse.
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // The picker sits in a portal, but React would still pass its submit to a form it opened from.
        event.stopPropagation();
        if (typed) onApply(typed);
        else setInvalid(true);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onCancel();
      }}
      sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1.5, width: 280 }}
    >
      <SaturationArea hsv={hsv} onChange={pick} />
      <Slider
        aria-label="Hue"
        aria-valuetext={`Hue ${Math.round(hsv.h)}°`}
        min={0}
        max={360}
        value={hsv.h}
        track={false}
        onChange={(_, h) => pick({ ...hsv, h: h as number })}
        sx={{
          height: 12,
          py: 1,
          "& .MuiSlider-rail": {
            opacity: 1,
            borderRadius: 6,
            background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          },
          "& .MuiSlider-thumb": {
            width: 18,
            height: 18,
            bgcolor: `hsl(${hsv.h} 100% 50%)`,
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.3)",
          },
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: typed ?? hsvToHex(hsv),
          }}
        />
        <TextField
          label="Hex"
          value={hex}
          onChange={(event) => {
            setHex(event.target.value);
            setInvalid(false);
            const next = readHex(event.target.value);
            if (next) setHsv(hexToHsv(next));
          }}
          onBlur={() => {
            if (typed) setHex(typed.toUpperCase());
          }}
          error={invalid}
          helperText={invalid ? "Enter a hex color like #1A73E8" : undefined}
          size="small"
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { autoComplete: "off", spellCheck: false },
            input: { sx: { fontFamily: "monospace" } },
          }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button size="small" onClick={onCancel} sx={{ ...formButtonSx, color: "text.primary" }}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" size="small" disableElevation sx={formButtonSx}>
          Apply
        </Button>
      </Box>
    </Box>
  );
}

type ColorPickerPopoverProps = Omit<ColorPickerProps, "onCancel"> & {
  /** What the picker opens below, or null while it is closed. */
  anchor: HTMLElement | null;
  onClose: () => void;
};

/** The color picker in a popover below `anchor`, which closes on Apply, Cancel, or Escape. */
export function ColorPickerPopover({
  anchor,
  onApply,
  onClose,
  ...picker
}: ColorPickerPopoverProps) {
  return (
    <Popover
      open={anchor !== null}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      {/* The popover mounts it only while open, so each opening starts from `initialColor`. */}
      <ColorPicker
        {...picker}
        onApply={(color) => {
          onApply(color);
          onClose();
        }}
        onCancel={onClose}
      />
    </Popover>
  );
}

/**
 * Saturation across and brightness up, in the current hue. Dragging or clicking picks both;
 * arrow keys step them, and Shift steps further.
 */
function SaturationArea({ hsv, onChange }: { hsv: Hsv; onChange: (hsv: Hsv) => void }) {
  const pickAt = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onChange({
      ...hsv,
      s: clamp((event.clientX - box.left) / box.width),
      v: 1 - clamp((event.clientY - box.top) / box.height),
    });
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const [ds, dv] = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowDown: [0, -step],
      ArrowUp: [0, step],
    }[event.key] ?? [0, 0];
    if (ds === 0 && dv === 0) return;
    event.preventDefault();
    onChange({ ...hsv, s: clamp(hsv.s + ds), v: clamp(hsv.v + dv) });
  };
  const percent = (value: number) => Math.round(value * 100);

  return (
    <Box
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- One range input cannot hold two values.
      role="slider"
      tabIndex={0}
      aria-label="Saturation and brightness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent(hsv.s)}
      aria-valuetext={`Saturation ${percent(hsv.s)}%, brightness ${percent(hsv.v)}%`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pickAt(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) pickAt(event);
      }}
      onKeyDown={handleKeyDown}
      sx={{
        position: "relative",
        height: 144,
        borderRadius: 2,
        cursor: "crosshair",
        touchAction: "none",
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid #fff",
          boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.3)",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function hexToHsv(hex: string): Hsv {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [value >> 16, value >> 8, value].map((channel) => (channel & 255) / 255);
  const max = Math.max(r, g, b);
  const range = max - Math.min(r, g, b);
  let h = 0;
  if (range > 0) {
    if (max === r) h = ((g - b) / range) % 6;
    else if (max === g) h = (b - r) / range + 2;
    else h = (r - g) / range + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : range / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[channel(5), channel(3), channel(1)]
    .map((value) =>
      Math.round(value * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
