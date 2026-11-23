import Add from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { alpha, type Theme } from "@mui/material/styles";
import { useState, type KeyboardEvent } from "react";
import { colorDotSx } from "./ColorDot";
import { ColorPickerPopover, defaultPickerColor } from "./ColorPicker";

export type Swatch = { name: string; color: string };

export type SwatchPickerProps = {
  /** The color row's accessible name. */
  label: string;
  colors: readonly Swatch[];
  /** A six-digit hex color, or null for no color. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Starts the row with a dotted option for null. */
  allowNone?: boolean;
  /** The dotted option's accessible name. Defaults to "No color". */
  noneLabel?: string;
  /**
   * Ends the row with a + button, after the radio group, that opens the color picker for any
   * other color. It shows a chosen custom color.
   */
  allowCustom?: boolean;
};

/**
 * A row of round color swatches that works as a radio group: one Tab stop, and arrow keys
 * choose the previous or next option. The chosen one is ringed. A custom color's + is a
 * separate button with its own Tab stop, so keyboard users can open the picker.
 */
export function SwatchPicker({
  label,
  colors,
  value,
  onChange,
  allowNone = false,
  noneLabel = "No color",
  allowCustom = false,
}: SwatchPickerProps) {
  // The + while it has the color picker open.
  const [customAnchor, setCustomAnchor] = useState<HTMLElement | null>(null);
  const custom =
    value !== null && !colors.some(({ color }) => sameColor(color, value)) ? value : null;
  const options: { label: string; value: string | null }[] = [
    ...(allowNone ? [{ label: noneLabel, value: null }] : []),
    ...colors.map(({ name, color }) => ({ label: name, value: color })),
  ];
  // None is checked while a custom color is chosen, which the + shows.
  const checked =
    custom === null
      ? options.findIndex((option) =>
          option.value === null ? value === null : value !== null && sameColor(option.value, value),
        )
      : -1;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    const radios = event.currentTarget.parentElement?.querySelectorAll("[role='radio']");
    (radios?.[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        role="radiogroup"
        aria-label={label}
        sx={{ display: "flex", flexGrow: 1, justifyContent: "space-between", gap: 0.25 }}
      >
        {options.map((option, index) => (
          <ButtonBase
            key={option.label}
            role="radio"
            aria-checked={index === checked}
            aria-label={option.label}
            // One Tab stop: the checked option, or the first while none is.
            tabIndex={index === Math.max(checked, 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            sx={[swatchSx, ringSx(index === checked, option.value), colorDotSx(option.value)]}
          />
        ))}
      </Box>
      {allowCustom ? (
        <>
          <ButtonBase
            aria-label={custom === null ? "Custom color" : `Custom color, ${custom.toUpperCase()}`}
            aria-haspopup="dialog"
            aria-expanded={customAnchor !== null}
            onClick={(event) => setCustomAnchor(event.currentTarget)}
            sx={[swatchSx, ringSx(custom !== null, custom), customSx(custom)]}
          >
            <Add sx={{ fontSize: 18 }} />
          </ButtonBase>
          <ColorPickerPopover
            anchor={customAnchor}
            initialColor={value ?? defaultPickerColor}
            label="Custom color"
            onApply={onChange}
            onClose={() => setCustomAnchor(null)}
          />
        </>
      ) : null}
    </Box>
  );
}

const sameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const swatchSx = {
  flexShrink: 0,
  width: 22,
  height: 22,
  borderRadius: "50%",
  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
} as const;

/** A ring around the chosen swatch, in a light tint of its color, set off by a small gap. */
function ringSx(chosen: boolean, color: string | null) {
  if (!chosen) return {};
  return {
    boxShadow: (theme: Theme) =>
      `0 0 0 2px ${theme.palette.background.default}, 0 0 0 4px ${alpha(
        color ?? theme.palette.text.secondary,
        0.45,
      )}`,
  };
}

/**
 * The + : an outlined circle, or, while a custom color is chosen, filled with it, its + in
 * whichever of black or white reads on it.
 */
function customSx(color: string | null) {
  if (color === null)
    return { border: 1.5, borderColor: "text.secondary", color: "text.secondary" };
  return { bgcolor: color, color: (theme: Theme) => theme.palette.getContrastText(color) };
}
