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
  /** Ends the row with a + that opens the color picker for any other color. */
  allowCustom?: boolean;
};

/**
 * A row of round color swatches that works as a radio group: one Tab stop, and arrow keys
 * choose the previous or next option. The chosen one is ringed.
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
  const isCustom = value !== null && !colors.some(({ color }) => sameColor(color, value));
  const options: { label: string; value: string | null; kind: "none" | "color" | "custom" }[] = [
    ...(allowNone ? [{ label: noneLabel, value: null, kind: "none" as const }] : []),
    ...colors.map(({ name, color }) => ({ label: name, value: color, kind: "color" as const })),
    ...(allowCustom
      ? [{ label: "Custom color", value: isCustom ? value : null, kind: "custom" as const }]
      : []),
  ];
  const checked = options.findIndex((option) =>
    option.kind === "custom"
      ? isCustom
      : option.value === null
        ? value === null
        : value !== null && sameColor(option.value, value),
  );

  const choose = (index: number) => {
    const option = options[index];
    if (option.kind !== "custom") onChange(option.value);
    else if (isCustom) onChange(value);
  };

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    let next = (index + step + options.length) % options.length;
    // Arrowing onto the + would open the color picker, so it stays a Tab stop and click.
    if (options[next].kind === "custom" && !isCustom)
      next = (next + step + options.length) % options.length;
    choose(next);
    const radios = event.currentTarget.parentElement?.querySelectorAll("[role='radio']");
    (radios?.[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <Box
      role="radiogroup"
      aria-label={label}
      sx={{ display: "flex", justifyContent: "space-between", gap: 0.25 }}
    >
      {options.map((option, index) => (
        <ButtonBase
          key={option.label}
          role="radio"
          aria-checked={index === checked}
          aria-label={option.label}
          // One Tab stop: the checked option, or the first while none is.
          tabIndex={index === Math.max(checked, 0) ? 0 : -1}
          onClick={(event) =>
            option.kind === "custom" ? setCustomAnchor(event.currentTarget) : choose(index)
          }
          onKeyDown={(event) => handleKeyDown(event, index)}
          sx={[swatchSx, ringSx(index === checked, option.value), kindSx(option)]}
        >
          {/* The + stays on a chosen custom color, which opens the picker again. */}
          {option.kind === "custom" ? <Add sx={{ fontSize: 18 }} /> : null}
        </ButtonBase>
      ))}
      {allowCustom ? (
        <ColorPickerPopover
          anchor={customAnchor}
          initialColor={value ?? defaultPickerColor}
          label="Custom color"
          onApply={onChange}
          onClose={() => setCustomAnchor(null)}
        />
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

function kindSx(option: { kind: "none" | "color" | "custom"; value: string | null }) {
  if (option.kind === "none") return colorDotSx(null);
  // A chosen custom color: its + in whichever of black or white reads on it.
  if (option.kind === "custom" && option.value !== null) {
    const color = option.value;
    return {
      bgcolor: color,
      color: (theme: Theme) => theme.palette.getContrastText(color),
    };
  }
  if (option.value !== null) return colorDotSx(option.value);
  // The + before a custom color is chosen: an outlined circle.
  return { border: 1.5, borderColor: "text.secondary", color: "text.secondary" };
}
