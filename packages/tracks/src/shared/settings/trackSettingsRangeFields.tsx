import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { useId } from "react";
import { parseFiniteNumber, useDraftController, type DraftValidation } from "./draftInput";
import { TrackSettingsFieldRow } from "./trackSettingsFieldGrid";

type CompleteRange = { min: number; max: number };
type RangeOverride = { min?: number; max?: number };
type RangeValues = Record<keyof CompleteRange, string>;
type RangeLabels = {
  maximumLabel?: string;
  minimumLabel?: string;
};

export type TrackSettingsRangeFieldsProps = RangeLabels &
  (
    | {
        mode: "independent";
        range: RangeOverride | undefined;
        onCommit: (range: RangeOverride | undefined) => TrackMutationResult;
      }
    | {
        mode?: "complete";
        range: CompleteRange | undefined;
        onCommit: (range: CompleteRange | undefined) => TrackMutationResult;
      }
  );

/** An optional range editor with complete-pair and independent-bound modes. */
export function TrackSettingsRangeFields(props: TrackSettingsRangeFieldsProps) {
  const errorId = useId();
  const maximumLabel = props.maximumLabel ?? "Maximum";
  const minimumLabel = props.minimumLabel ?? "Minimum";
  const controller = useDraftController<RangeValues, RangeOverride | undefined>({
    value: props.range,
    toRaw: toRangeValues,
    validate: (values) => validateRange(values, props.mode ?? "complete"),
    isEqual: rangesAreEqual,
    onCommit: (range) => {
      if (props.mode === "independent") return props.onCommit(range);
      return props.onCommit(range as CompleteRange | undefined);
    },
  });
  const values = controller.value;
  const hasError = controller.error !== undefined;

  const updateBound = (bound: keyof CompleteRange, value: string) => {
    controller.change({ ...values, [bound]: value });
  };

  const useAutomaticRange = () => {
    controller.submit({ min: "", max: "" });
  };

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <TrackSettingsFieldRow>
        <TextField
          error={hasError}
          fullWidth
          label={minimumLabel}
          size="small"
          slotProps={{
            htmlInput: {
              "aria-describedby": hasError ? errorId : undefined,
              inputMode: "decimal",
            },
          }}
          type="text"
          value={values.min}
          onBlur={controller.blur}
          onChange={(event) => updateBound("min", event.target.value)}
          onKeyDown={controller.keyDown}
        />
        <TextField
          error={hasError}
          fullWidth
          label={maximumLabel}
          size="small"
          slotProps={{
            htmlInput: {
              "aria-describedby": hasError ? errorId : undefined,
              inputMode: "decimal",
            },
          }}
          type="text"
          value={values.max}
          onBlur={controller.blur}
          onChange={(event) => updateBound("max", event.target.value)}
          onKeyDown={controller.keyDown}
        />
      </TrackSettingsFieldRow>
      {controller.error ? (
        <FormHelperText id={errorId} error sx={{ mx: 1.75 }}>
          {controller.error}
        </FormHelperText>
      ) : null}
      <Button
        size="small"
        sx={{ justifySelf: "start", textTransform: "none" }}
        type="button"
        onClick={useAutomaticRange}
      >
        Use automatic range
      </Button>
    </Box>
  );
}

function toRangeValues(range: RangeOverride | undefined): RangeValues {
  return {
    min: range?.min === undefined ? "" : String(range.min),
    max: range?.max === undefined ? "" : String(range.max),
  };
}

function validateRange(
  values: RangeValues,
  mode: "complete" | "independent",
): DraftValidation<RangeOverride | undefined> {
  const minimumIsBlank = values.min.trim() === "";
  const maximumIsBlank = values.max.trim() === "";
  if (minimumIsBlank && maximumIsBlank) return { ok: true, value: undefined };
  if (mode === "complete" && (minimumIsBlank || maximumIsBlank)) {
    return { ok: false, error: "Enter both minimum and maximum." };
  }

  const minimum = minimumIsBlank ? undefined : parseFiniteNumber(values.min);
  if (minimum && !minimum.ok) return { ok: false, error: `Minimum: ${minimum.error}` };

  const maximum = maximumIsBlank ? undefined : parseFiniteNumber(values.max);
  if (maximum && !maximum.ok) return { ok: false, error: `Maximum: ${maximum.error}` };

  if (minimum && maximum && minimum.value >= maximum.value) {
    return { ok: false, error: "Minimum must be less than maximum." };
  }

  return {
    ok: true,
    value: {
      ...(minimum ? { min: minimum.value } : {}),
      ...(maximum ? { max: maximum.value } : {}),
    },
  };
}

function rangesAreEqual(left: RangeOverride | undefined, right: RangeOverride | undefined) {
  return left?.min === right?.min && left?.max === right?.max;
}
