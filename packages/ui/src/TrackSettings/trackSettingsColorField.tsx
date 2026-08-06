import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  constrainHsv,
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  validateHexColorDraft,
  type HsvColor,
} from "./color";
import { useDraftController, type DraftValidation } from "./draftInput";

type CommonTrackSettingsColorFieldProps = {
  disabled?: boolean;
  label: string;
};

export type TrackSettingsColorFieldProps = CommonTrackSettingsColorFieldProps & {
  value: string;
  onCommit: (color: string) => TrackMutationResult;
};

type PickerSession = {
  color: HsvColor;
  emittedColor?: string;
  externalColor: string;
};

/** A validated hexadecimal field with an accessible saturation/value and hue picker. */
export function TrackSettingsColorField(props: TrackSettingsColorFieldProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLButtonElement>();
  const [pickerSession, setPickerSession] = useState<PickerSession>();
  const openingControlRef = useRef<HTMLButtonElement>(null);
  const activePointerRef = useRef<number | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const pendingColorRef = useRef<HsvColor | undefined>(undefined);
  const shouldRestoreFocusRef = useRef(false);
  const externalColor = requireHexColor(props.value);

  const controller = useDraftController<string, string>({
    value: props.value,
    toRaw: (color) => normalizeHexColor(color) ?? color,
    validate: (value): DraftValidation<string> => validateHexColorDraft(value),
    isEqual: colorsAreEqual,
    onCommit: (color) => {
      if (props.disabled) return { ok: false, error: "The color field is disabled." };
      return props.onCommit(color);
    },
    debounceMs: false,
  });
  const externalPickerColor = hexToHsv(externalColor);
  let currentPickerSession = pickerSession;
  if (pickerSession !== undefined && pickerSession.externalColor !== externalColor) {
    currentPickerSession = {
      color:
        pickerSession.emittedColor === externalColor ? pickerSession.color : externalPickerColor,
      externalColor,
    };
    setPickerSession(currentPickerSession);
  }
  const pickerColor = currentPickerSession?.color ?? externalPickerColor;
  const pickerHexColor = hsvToHex(pickerColor);
  const pickerIsOpen = anchorElement !== undefined && !props.disabled;

  useEffect(() => {
    if (!props.disabled || anchorElement === undefined) return;
    cancelPendingPickerCommit();
    setPickerSession(undefined);
    setAnchorElement(undefined);
  }, [anchorElement, props.disabled]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (pickerIsOpen || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    if (!props.disabled) openingControlRef.current?.focus();
  }, [pickerIsOpen, props.disabled]);

  const focusSaturationControl = useCallback((element: HTMLInputElement | null) => {
    element?.focus();
  }, []);

  const closePicker = () => {
    flushPickerCommit();
    shouldRestoreFocusRef.current = true;
    setPickerSession(undefined);
    setAnchorElement(undefined);
  };

  const openPicker = (element: HTMLButtonElement) => {
    if (props.disabled) return;
    setPickerSession({
      color: externalPickerColor,
      externalColor,
    });
    setAnchorElement(element);
  };

  const commitPickerColor = (nextColor: HsvColor) => {
    if (props.disabled) return;
    const color = constrainHsv(nextColor);
    const hexColor = hsvToHex(color);
    const result = controller.submit(hexColor, { retainRejectedDraft: false });
    if (!result.ok) {
      setPickerSession({ color: externalPickerColor, externalColor });
      return;
    }
    setPickerSession((session) => ({
      color: session?.color ?? color,
      emittedColor: hexColor,
      externalColor: session?.externalColor ?? externalColor,
    }));
  };

  const cancelPendingPickerCommit = () => {
    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    pendingColorRef.current = undefined;
  };

  const flushPickerCommit = () => {
    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    const color = pendingColorRef.current;
    pendingColorRef.current = undefined;
    if (color !== undefined) commitPickerColor(color);
  };

  const previewPickerColor = (nextColor: HsvColor) => {
    if (props.disabled) return;
    const color = constrainHsv(nextColor);
    setPickerSession((session) => ({
      color,
      emittedColor: session?.emittedColor,
      externalColor: session?.externalColor ?? externalColor,
    }));
    pendingColorRef.current = color;
    if (animationFrameRef.current !== undefined) return;
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = undefined;
      const pendingColor = pendingColorRef.current;
      pendingColorRef.current = undefined;
      if (pendingColor !== undefined) commitPickerColor(pendingColor);
    });
  };

  const updateSaturationValueFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const saturation = ((event.clientX - bounds.left) / bounds.width) * 100;
    const value = ((bounds.bottom - event.clientY) / bounds.height) * 100;
    previewPickerColor({ ...pickerColor, saturation, value });
  };

  return (
    <>
      <TextField
        disabled={props.disabled}
        error={controller.error !== undefined}
        fullWidth
        helperText={controller.error}
        label={props.label}
        required
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
                      bgcolor: externalColor,
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
              p: 1.25,
              pb: 1.5,
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
        <Stack aria-label={`${props.label} color picker`} role="group" spacing={1}>
          <Box
            sx={{
              "&:focus-within > [role='img']": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: -3,
              },
              position: "relative",
            }}
          >
            <Box
              aria-label={`${props.label} saturation and brightness plane. Use the saturation and brightness controls for keyboard input.`}
              role="img"
              sx={{
                aspectRatio: "4 / 3",
                bgcolor: hsvToHex({ hue: pickerColor.hue, saturation: 100, value: 100 }),
                backgroundImage:
                  "linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, transparent)",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                boxSizing: "border-box",
                cursor: "crosshair",
                overflow: "hidden",
                position: "relative",
                touchAction: "none",
                width: "100%",
              }}
              onLostPointerCapture={() => {
                activePointerRef.current = undefined;
                flushPickerCommit();
              }}
              onPointerDown={(event) => {
                if (props.disabled || !event.isPrimary || event.button !== 0) return;
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
                flushPickerCommit();
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  bgcolor: pickerHexColor,
                  border: "3px solid white",
                  borderRadius: "50%",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.7)",
                  boxSizing: "border-box",
                  height: 20,
                  left: `${pickerColor.saturation}%`,
                  position: "absolute",
                  top: `${100 - pickerColor.value}%`,
                  transform: "translate(-50%, -50%)",
                  width: 20,
                }}
              />
            </Box>
            <Slider
              aria-label={`${props.label} saturation`}
              getAriaValueText={(saturation) => `${Math.round(saturation)} percent saturation`}
              max={100}
              min={0}
              size="small"
              slotProps={{ input: { ref: focusSaturationControl } }}
              step={1}
              sx={visuallyHiddenSliderSx}
              value={pickerColor.saturation}
              onChange={(_event, saturation) => {
                if (typeof saturation === "number") {
                  previewPickerColor({ ...pickerColor, saturation });
                }
              }}
              onChangeCommitted={flushPickerCommit}
            />
            <Slider
              aria-label={`${props.label} brightness`}
              getAriaValueText={(value) => `${Math.round(value)} percent brightness`}
              max={100}
              min={0}
              size="small"
              step={1}
              sx={visuallyHiddenSliderSx}
              value={pickerColor.value}
              onChange={(_event, value) => {
                if (typeof value === "number") previewPickerColor({ ...pickerColor, value });
              }}
              onChangeCommitted={flushPickerCommit}
            />
          </Box>
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
              mx: 0.5,
              py: 0.625,
              width: "calc(100% - 8px)",
              "& .MuiSlider-rail": {
                background:
                  "linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)",
                borderRadius: 1,
                opacity: 1,
              },
              "& .MuiSlider-track": { display: "none" },
              "& .MuiSlider-thumb": {
                bgcolor: hsvToHex({ hue: pickerColor.hue, saturation: 100, value: 100 }),
                border: "3px solid white",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.55)",
                height: 18,
                width: 18,
              },
            }}
            value={pickerColor.hue}
            onChange={(_event, hue) => {
              if (typeof hue === "number") previewPickerColor({ ...pickerColor, hue });
            }}
            onChangeCommitted={flushPickerCommit}
          />
        </Stack>
      </Popover>
    </>
  );
}

const visuallyHiddenSliderSx = {
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  left: 0,
  overflow: "hidden",
  p: 0,
  position: "absolute",
  top: 0,
  whiteSpace: "nowrap",
  width: 1,
} as const;

function colorsAreEqual(left: string, right: string) {
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
