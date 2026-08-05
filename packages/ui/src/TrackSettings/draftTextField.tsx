import TextField from "@mui/material/TextField";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { useDraftController, type DraftValidation } from "./draftInput";

export type DraftTextFieldProps = {
  autoComplete?: string;
  disabled?: boolean;
  inputMode?: "email" | "search" | "tel" | "text" | "url";
  label: string;
  normalize?: (value: string) => string;
  onCommit: (value: string) => TrackMutationResult;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "url";
  validate: (value: string) => string | undefined;
  value: string;
};

/** A compact text field that retains its local draft until it is accepted. */
export function DraftTextField({
  autoComplete,
  disabled,
  inputMode,
  label,
  normalize = (nextValue) => nextValue,
  onCommit,
  placeholder,
  required,
  type = "text",
  validate,
  value,
}: DraftTextFieldProps) {
  const controller = useDraftController<string, string>({
    value,
    toRaw: (nextValue) => nextValue,
    validate: (nextValue): DraftValidation<string> => {
      const error = validate(nextValue);
      return error === undefined ? { ok: true, value: normalize(nextValue) } : { ok: false, error };
    },
    isEqual: Object.is,
    onCommit,
  });

  return (
    <TextField
      autoComplete={autoComplete}
      disabled={disabled}
      error={controller.error !== undefined}
      fullWidth
      helperText={controller.error}
      label={label}
      placeholder={placeholder}
      required={required}
      size="small"
      slotProps={{ htmlInput: { inputMode } }}
      type={type}
      value={controller.value}
      onBlur={controller.blur}
      onChange={(event) => controller.change(event.target.value)}
      onKeyDown={controller.keyDown}
    />
  );
}
