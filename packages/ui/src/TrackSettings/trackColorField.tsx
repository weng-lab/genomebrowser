import ClearIcon from "@mui/icons-material/Clear";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import {
  constrainHsv,
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  validateHexColorDraft,
  type HsvColor,
} from "./color";
import { useDraftController, type DraftValidation } from "./draftInput";

type CommonTrackColorFieldProps = {
  disabled?: boolean;
  label: string;
};

type RequiredTrackColorFieldProps = CommonTrackColorFieldProps &
  (
    | { fallbackColor: string; value: string | undefined }
    | { fallbackColor?: undefined; value: string }
  ) & {
    mode: "required";
    onCommit: (color: string) => TrackMutationResult;
  };

type OptionalTrackColorFieldProps = CommonTrackColorFieldProps & {
  fallbackColor: string;
  mode: "optional";
  value: string | undefined;
  onCommit: (color: string | undefined) => TrackMutationResult;
};

export type TrackColorFieldProps = RequiredTrackColorFieldProps | OptionalTrackColorFieldProps;

type PickerSession = {
  color: HsvColor;
  emittedColor?: string;
  externalColor: string;
  externalValue: string | undefined;
};

/** A validated hexadecimal field with an accessible saturation/value and hue picker. */
export function TrackColorField(props: TrackColorFieldProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLButtonElement>();
  const [pickerSession, setPickerSession] = useState<PickerSession>();
  const openingControlRef = useRef<HTMLButtonElement>(null);
  const activePointerRef = useRef<number | undefined>(undefined);
  const shouldRestoreFocusRef = useRef(false);
  const instructionId = useId();
  const optional = props.mode === "optional";
  const fallbackColor =
    props.fallbackColor === undefined ? undefined : requireHexColor(props.fallbackColor);
  const explicitColor = props.value === undefined ? undefined : normalizeHexColor(props.value);
  const pickerSourceColor = explicitColor ?? fallbackColor;
  if (pickerSourceColor === undefined) throw new Error("A color field must have a picker color");
  const hasExplicitValue = props.value !== undefined;
  const swatchColor = props.value ?? pickerSourceColor;

  const controller = useDraftController<string, string | undefined>({
    value: props.value,
    toRaw: (color) =>
      color === undefined
        ? optional
          ? ""
          : pickerSourceColor
        : (normalizeHexColor(color) ?? color),
    validate: (value): DraftValidation<string | undefined> =>
      validateHexColorDraft(value, optional),
    isEqual: colorsAreEqual,
    onCommit: (color) => {
      if (props.disabled) return { ok: false, error: "The color field is disabled." };
      if (props.mode === "optional") return props.onCommit(color);
      if (color === undefined) {
        return { ok: false, error: "A required color cannot be cleared." };
      }
      return props.onCommit(color);
    },
    debounceMs: false,
  });
  const externalPickerColor = hexToHsv(pickerSourceColor);
  let currentPickerSession = pickerSession;
  if (
    pickerSession !== undefined &&
    (!colorsAreEqual(pickerSession.externalValue, props.value) ||
      pickerSession.externalColor !== pickerSourceColor)
  ) {
    currentPickerSession = {
      color:
        pickerSession.emittedColor === pickerSourceColor
          ? pickerSession.color
          : externalPickerColor,
      externalColor: pickerSourceColor,
      externalValue: props.value,
    };
    setPickerSession(currentPickerSession);
  }
  const pickerColor = currentPickerSession?.color ?? externalPickerColor;
  const pickerHexColor = hsvToHex(pickerColor);
  const pickerIsOpen = anchorElement !== undefined && !props.disabled;

  useEffect(() => {
    if (!props.disabled || anchorElement === undefined) return;
    setPickerSession(undefined);
    setAnchorElement(undefined);
  }, [anchorElement, props.disabled]);

  useEffect(() => {
    if (pickerIsOpen || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    if (!props.disabled) openingControlRef.current?.focus();
  }, [pickerIsOpen, props.disabled]);

  const focusSaturationControl = useCallback((element: HTMLInputElement | null) => {
    element?.focus();
  }, []);

  const closePicker = () => {
    shouldRestoreFocusRef.current = true;
    setPickerSession(undefined);
    setAnchorElement(undefined);
  };

  const openPicker = (element: HTMLButtonElement) => {
    if (props.disabled) return;
    setPickerSession({
      color: externalPickerColor,
      externalColor: pickerSourceColor,
      externalValue: props.value,
    });
    setAnchorElement(element);
  };

  const emitPickerColor = (nextColor: HsvColor) => {
    if (props.disabled) return;
    const color = constrainHsv(nextColor);
    const hexColor = hsvToHex(color);
    const result = controller.submit(hexColor, { retainRejectedDraft: false });
    if (!result.ok) return;
    setPickerSession({
      color,
      emittedColor: hexColor,
      externalColor: pickerSourceColor,
      externalValue: props.value,
    });
  };

  const updateSaturationValueFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const saturation = ((event.clientX - bounds.left) / bounds.width) * 100;
    const value = ((bounds.bottom - event.clientY) / bounds.height) * 100;
    emitPickerColor({ ...pickerColor, saturation, value });
  };

  return (
    <>
      <TextField
        disabled={props.disabled}
        error={controller.error !== undefined}
        fullWidth
        helperText={
          controller.error ??
          (!hasExplicitValue ? `Using fallback ${pickerSourceColor}.` : undefined)
        }
        label={props.label}
        placeholder={fallbackColor}
        required={!optional}
        size="small"
        slotProps={{
          htmlInput: { inputMode: "text", spellCheck: false },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <IconButton
                  ref={openingControlRef}
                  aria-label={`Open ${props.label} color picker`}
                  disabled={props.disabled}
                  disableRipple
                  edge="start"
                  size="small"
                  sx={{
                    "&.Mui-focusVisible": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      outlineOffset: 1,
                    },
                  }}
                  type="button"
                  onClick={(event) => openPicker(event.currentTarget)}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      bgcolor: swatchColor,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 0.5,
                      boxSizing: "border-box",
                      height: 20,
                      width: 20,
                    }}
                  />
                </IconButton>
              </InputAdornment>
            ),
            endAdornment: optional ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label={`Clear ${props.label}`}
                  disabled={props.disabled || !hasExplicitValue}
                  edge="end"
                  size="small"
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => controller.submit("")}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
        value={controller.value}
        onBlur={controller.blur}
        onChange={(event) => controller.change(event.target.value)}
        onKeyDown={controller.keyDown}
      />
      <Popover
        anchorEl={anchorElement}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        marginThreshold={8}
        open={pickerIsOpen}
        transformOrigin={{ horizontal: "left", vertical: "top" }}
        slotProps={{
          paper: {
            sx: {
              boxSizing: "border-box",
              maxWidth: "calc(100vw - 16px)",
              p: 1.5,
              width: "min(17rem, calc(100vw - 16px))",
            },
          },
        }}
        onClose={closePicker}
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          closePicker();
        }}
      >
        <Stack aria-label={`${props.label} color picker`} role="group" spacing={1.25}>
          <Box
            aria-label={`${props.label} saturation and brightness plane. Use the saturation and brightness controls for keyboard input.`}
            role="img"
            sx={{
              aspectRatio: "3 / 2",
              bgcolor: hsvToHex({ hue: pickerColor.hue, saturation: 100, value: 100 }),
              backgroundImage:
                "linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, transparent)",
              border: 1,
              borderColor: "divider",
              borderRadius: 0.5,
              cursor: "crosshair",
              position: "relative",
              touchAction: "none",
              width: "100%",
            }}
            onLostPointerCapture={() => {
              activePointerRef.current = undefined;
            }}
            onPointerDown={(event) => {
              if (props.disabled || !event.isPrimary || event.button !== 0) {
                return;
              }
              activePointerRef.current = event.pointerId;
              event.currentTarget.setPointerCapture?.(event.pointerId);
              updateSaturationValueFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.isPrimary && activePointerRef.current === event.pointerId) {
                updateSaturationValueFromPointer(event);
              }
            }}
            onPointerUp={(event) => {
              if (activePointerRef.current !== event.pointerId) return;
              activePointerRef.current = undefined;
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                bgcolor: pickerHexColor,
                border: "2px solid white",
                borderRadius: "50%",
                boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.65)",
                height: 12,
                left: `${pickerColor.saturation}%`,
                position: "absolute",
                top: `${100 - pickerColor.value}%`,
                transform: "translate(-50%, -50%)",
                width: 12,
              }}
            />
          </Box>
          <Box>
            <Typography component="label" id={`${instructionId}-saturation`} variant="caption">
              Saturation
            </Typography>
            <Slider
              aria-label={`${props.label} saturation`}
              getAriaValueText={(saturation) => `${Math.round(saturation)} percent saturation`}
              max={100}
              min={0}
              size="small"
              slotProps={{ input: { ref: focusSaturationControl } }}
              step={1}
              value={pickerColor.saturation}
              onChange={(_event, saturation) => {
                if (typeof saturation === "number") {
                  emitPickerColor({ ...pickerColor, saturation });
                }
              }}
            />
          </Box>
          <Box>
            <Typography component="label" id={`${instructionId}-brightness`} variant="caption">
              Brightness
            </Typography>
            <Slider
              aria-label={`${props.label} brightness`}
              getAriaValueText={(value) => `${Math.round(value)} percent brightness`}
              max={100}
              min={0}
              size="small"
              step={1}
              value={pickerColor.value}
              onChange={(_event, value) => {
                if (typeof value === "number") emitPickerColor({ ...pickerColor, value });
              }}
            />
          </Box>
          <Box>
            <Typography component="label" id={`${instructionId}-hue`} variant="caption">
              Hue
            </Typography>
            <Slider
              aria-label={`${props.label} hue`}
              getAriaValueText={(hue) => `${Math.round(hue)} degrees`}
              max={359}
              min={0}
              size="small"
              step={1}
              sx={{
                color: "transparent",
                height: 8,
                py: 1,
                "& .MuiSlider-rail": {
                  background:
                    "linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)",
                  opacity: 1,
                },
                "& .MuiSlider-track": { display: "none" },
                "& .MuiSlider-thumb": {
                  bgcolor: hsvToHex({ hue: pickerColor.hue, saturation: 100, value: 100 }),
                  border: "2px solid white",
                  boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.65)",
                },
              }}
              value={pickerColor.hue}
              onChange={(_event, hue) => {
                if (typeof hue === "number") emitPickerColor({ ...pickerColor, hue });
              }}
            />
          </Box>
          <Typography variant="body2">Selected color: {pickerHexColor}</Typography>
        </Stack>
      </Popover>
    </>
  );
}

function colorsAreEqual(left: string | undefined, right: string | undefined) {
  if (left === undefined || right === undefined) return left === right;
  const normalizedLeft = normalizeHexColor(left);
  const normalizedRight = normalizeHexColor(right);
  if (normalizedLeft === undefined || normalizedRight === undefined) return left === right;
  return normalizedLeft === normalizedRight;
}

function requireHexColor(value: string) {
  const color = normalizeHexColor(value);
  if (color === undefined)
    throw new Error(`Expected a six-digit hexadecimal color, received ${value}`);
  return color;
}
