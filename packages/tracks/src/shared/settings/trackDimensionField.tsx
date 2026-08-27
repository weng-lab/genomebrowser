import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { parseFiniteNumber, useDraftController, type DraftValidation } from "./draftInput";

type TrackDimensionFieldProps = {
  label: string;
  min: number;
  onApplyToAll: (value: number) => TrackMutationResult;
  onCommit: (value: number) => TrackMutationResult;
  validate: (value: number) => string | undefined;
  value: number;
};

export function TrackDimensionField({
  label,
  min,
  onApplyToAll,
  onCommit,
  validate,
  value,
}: TrackDimensionFieldProps) {
  const validateDraft = (nextValue: string): DraftValidation<number> => {
    const parsedValue = parseFiniteNumber(nextValue);
    if (!parsedValue.ok) return parsedValue;

    const error = validate(parsedValue.value);
    return error === undefined ? parsedValue : { ok: false, error };
  };
  const controller = useDraftController<string, number>({
    value,
    toRaw: String,
    validate: validateDraft,
    isEqual: Object.is,
    onCommit,
  });
  const displayedValue = validateDraft(controller.value);

  return (
    <Box
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) controller.blur();
      }}
      sx={{ alignItems: "start", display: "flex", gap: 1, minWidth: 0 }}
    >
      <TextField
        error={controller.error !== undefined}
        fullWidth
        helperText={controller.error}
        label={label}
        required
        size="small"
        slotProps={{ htmlInput: { inputMode: "decimal", min } }}
        sx={{ minWidth: 0 }}
        type="text"
        value={controller.value}
        onChange={(event) => controller.change(event.target.value)}
        onKeyDown={controller.keyDown}
      />
      <Button
        aria-label={`Apply ${label} to all tracks of this type`}
        disabled={!displayedValue.ok}
        size="small"
        sx={{ flex: "0 0 auto", height: 40, whiteSpace: "nowrap" }}
        variant="outlined"
        onClick={() =>
          controller.submit(controller.value, {
            commitUnchanged: true,
            onCommit: onApplyToAll,
          })
        }
      >
        Apply to all
      </Button>
    </Box>
  );
}
