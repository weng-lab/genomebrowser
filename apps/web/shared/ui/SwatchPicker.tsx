import Add from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { alpha, type Theme } from "@mui/material/styles";
import { useRef, type KeyboardEvent } from "react";
import { visuallyHidden } from "./theme";

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
  /** Ends the row with a + that opens the system color picker for any other color. */
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
  const customInput = useRef<HTMLInputElement>(null);
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
    else openCustom();
  };
  const openCustom = () => {
    const input = customInput.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    let next = (index + step + options.length) % options.length;
    // Arrowing onto the + would open the system picker, so it stays a Tab stop and click.
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
          onClick={() => (option.kind === "custom" ? openCustom() : choose(index))}
          onKeyDown={(event) => handleKeyDown(event, index)}
          sx={[swatchSx, ringSx(index === checked, option.value), kindSx(option)]}
        >
          {option.kind === "custom" && !isCustom ? <Add sx={{ fontSize: 18 }} /> : null}
        </ButtonBase>
      ))}
      {allowCustom ? (
        <Box
          component="input"
          ref={customInput}
          type="color"
          tabIndex={-1}
          aria-hidden
          value={isCustom ? value : "#000000"}
          onChange={(event) => onChange((event.target as HTMLInputElement).value)}
          sx={visuallyHidden}
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
  if (option.kind === "none")
    return { border: 2, borderStyle: "dotted", borderColor: "text.secondary" };
  if (option.value !== null) return { bgcolor: option.value };
  // The + before a custom color is chosen: an outlined circle.
  return { border: 1.5, borderColor: "text.secondary", color: "text.secondary" };
}
