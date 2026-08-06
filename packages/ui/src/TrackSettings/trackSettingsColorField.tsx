import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { normalizeHexColor, validateHexColorDraft } from "./color";
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
  color: string;
  emittedColor?: string;
  externalColor: string;
};

/** A validated hexadecimal field with an accessible visual color picker. */
export function TrackSettingsColorField(props: TrackSettingsColorFieldProps) {
  return (
    <TrackSettingsColorFieldSession key={props.disabled ? "disabled" : "enabled"} {...props} />
  );
}

function TrackSettingsColorFieldSession(props: TrackSettingsColorFieldProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLButtonElement>();
  const [pickerSession, setPickerSession] = useState<PickerSession>();
  const openingControlRef = useRef<HTMLButtonElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const pendingColorRef = useRef<string | undefined>(undefined);
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
  let currentPickerSession = pickerSession;
  if (pickerSession !== undefined && pickerSession.externalColor !== externalColor) {
    currentPickerSession = {
      color: pickerSession.emittedColor === externalColor ? pickerSession.color : externalColor,
      externalColor,
    };
    setPickerSession(currentPickerSession);
  }
  const pickerColor = currentPickerSession?.color ?? externalColor;
  const pickerIsOpen = anchorElement !== undefined && !props.disabled;

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

  const closePicker = () => {
    flushPickerCommit();
    shouldRestoreFocusRef.current = true;
    setPickerSession(undefined);
    setAnchorElement(undefined);
  };

  const openPicker = (element: HTMLButtonElement) => {
    if (props.disabled) return;
    setPickerSession({
      color: externalColor,
      externalColor,
    });
    setAnchorElement(element);
  };

  const commitPickerColor = (nextColor: string) => {
    if (props.disabled) return;
    const hexColor = normalizeHexColor(nextColor);
    if (hexColor === undefined) return;
    const result = controller.submit(hexColor, { retainRejectedDraft: false });
    if (!result.ok) {
      setPickerSession({ color: externalColor, externalColor });
      return;
    }
    setPickerSession((session) => ({
      color: session?.color ?? hexColor,
      emittedColor: hexColor,
      externalColor: session?.externalColor ?? externalColor,
    }));
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

  const previewPickerColor = (nextColor: string) => {
    if (props.disabled) return;
    const color = normalizeHexColor(nextColor);
    if (color === undefined) return;
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
              borderRadius: 2,
              boxSizing: "border-box",
              maxWidth: "calc(100vw - 16px)",
              overflow: "visible",
              p: 0,
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
        <Box aria-label={`${props.label} color picker`} role="group">
          <HexColorPicker
            aria-label={`${props.label} visual color controls`}
            color={pickerColor}
            style={{ width: "100%" }}
            onChange={previewPickerColor}
            onChangeEnd={(color) => {
              pendingColorRef.current = normalizeHexColor(color);
              flushPickerCommit();
            }}
          />
        </Box>
      </Popover>
    </>
  );
}

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
