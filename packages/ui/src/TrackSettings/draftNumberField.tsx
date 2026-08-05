import TextField from "@mui/material/TextField";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { parseFiniteNumber, useDraftController, type DraftValidation } from "./draftInput";

export type DraftNumberFieldProps = {
  disabled?: boolean;
  inputMode?: "decimal" | "numeric";
  label: string;
  min?: number;
  onCommit: (value: number) => TrackMutationResult;
  required?: boolean;
  step?: "any" | number;
  validate: (value: number) => string | undefined;
  value: number;
};

/**
 * A numeric text field that allows incomplete number syntax while a user is
 * still typing. It deliberately uses a text input so browsers do not sanitize
 * values such as "-" or "1." before the draft controller can retain them.
 */
export function DraftNumberField({
  disabled,
  inputMode = "decimal",
  label,
  min,
  onCommit,
  required,
  step,
  validate,
  value,
}: DraftNumberFieldProps) {
  const controller = useDraftController<string, number>({
    value,
    toRaw: String,
    validate: (nextValue): DraftValidation<number> => {
      const parsedValue = parseFiniteNumber(nextValue);
      if (!parsedValue.ok) return parsedValue;

      const error = validate(parsedValue.value);
      return error === undefined ? parsedValue : { ok: false, error };
    },
    isEqual: Object.is,
    onCommit,
  });

  return (
    <TextField
      disabled={disabled}
      error={controller.error !== undefined}
      fullWidth
      helperText={controller.error}
      label={label}
      required={required}
      size="small"
      slotProps={{ htmlInput: { inputMode, min, step } }}
      type="text"
      value={controller.value}
      onBlur={controller.blur}
      onChange={(event) => controller.change(event.target.value)}
      onKeyDown={controller.keyDown}
    />
  );
}
