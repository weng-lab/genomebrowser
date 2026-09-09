import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { BrowserStoreInstance, Highlight } from "@weng-lab/genomebrowser";
import { useReducer, type SyntheticEvent } from "react";
import { formatRegion, parseHighlightRegion, resolveHighlightRegion } from "./highlightRegion";

const defaultColor = "#3366cc";

type FormErrors = Partial<Record<"name" | "region" | "opacity", string>>;

type FormValues = {
  name: string;
  region: string;
  color: string;
  opacity: string;
  highlightType: NonNullable<Highlight["type"]>;
};
type FormState = FormValues & { errors: FormErrors };
type FormAction =
  | { type: "fieldChanged"; field: Exclude<keyof FormValues, "highlightType">; value: string }
  | { type: "typeChanged"; value: NonNullable<Highlight["type"]> }
  | { type: "validationFailed"; errors: FormErrors }
  | { type: "reset" };

const initialFormState: FormState = {
  name: "",
  region: "",
  color: defaultColor,
  opacity: "20",
  highlightType: "filled",
  errors: {},
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "fieldChanged":
      return {
        ...state,
        [action.field]: action.value,
        errors:
          action.field === "color" ? state.errors : { ...state.errors, [action.field]: undefined },
      };
    case "typeChanged":
      return {
        ...state,
        highlightType: action.value,
        opacity: action.value === "outlined" ? "100" : "20",
      };
    case "validationFailed":
      return { ...state, errors: action.errors };
    case "reset":
      return initialFormState;
  }
}

type HighlightFormProps = {
  browserStore: BrowserStoreInstance;
  initialHighlight?: Highlight;
  onSaved?: () => void;
  onCancel?: () => void;
};

export function HighlightForm({
  browserStore,
  initialHighlight,
  onSaved,
  onCancel,
}: HighlightFormProps) {
  const useBrowserStore = browserStore;
  const assembly = useBrowserStore((state) => state.assembly);
  const currentRegion = useBrowserStore((state) => state.region);
  const highlights = useBrowserStore((state) => state.highlights);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const [
    { name, region: regionInput, color, opacity: opacityInput, highlightType, errors },
    dispatch,
  ] = useReducer(
    formReducer,
    initialHighlight
      ? {
          name: initialHighlight.id,
          region: formatRegion(resolveHighlightRegion(initialHighlight, currentRegion.chromosome)),
          color: initialHighlight.color,
          opacity: String(
            (initialHighlight.opacity ?? (initialHighlight.type === "outlined" ? 1 : 0.2)) * 100,
          ),
          highlightType: initialHighlight.type ?? "filled",
          errors: {},
        }
      : initialFormState,
  );

  function handleUseCurrentRegion() {
    dispatch({ type: "fieldChanged", field: "region", value: formatRegion(currentRegion) });
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const nextErrors: FormErrors = {};
    if (!trimmedName) {
      nextErrors.name = "ID is required.";
    } else if (
      highlights.some(
        (highlight) => highlight.id === trimmedName && highlight.id !== initialHighlight?.id,
      )
    ) {
      nextErrors.name = "Highlight IDs must be unique.";
    }

    const regionResult = parseHighlightRegion(regionInput, assembly);
    if (!regionResult.ok) nextErrors.region = regionResult.error;

    const opacity = Number(opacityInput);
    if (!opacityInput.trim() || !Number.isFinite(opacity) || opacity < 0 || opacity > 100) {
      nextErrors.opacity = "Enter a number from 0 to 100.";
    }

    if (!trimmedName || !regionResult.ok || Object.keys(nextErrors).length > 0) {
      dispatch({ type: "validationFailed", errors: nextErrors });
      return;
    }

    const nextHighlight: Highlight = {
      id: trimmedName,
      region: regionResult.region,
      color,
      opacity: opacity / 100,
      type: highlightType,
    };
    if (initialHighlight) {
      browserStore.setState((state) => ({
        highlights: state.highlights.map((highlight) =>
          highlight.id === initialHighlight.id ? nextHighlight : highlight,
        ),
      }));
      onSaved?.();
    } else {
      addHighlight(nextHighlight);
      dispatch({ type: "reset" });
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
          <TextField
            autoFocus={Boolean(initialHighlight)}
            autoComplete="off"
            error={Boolean(errors.region)}
            fullWidth
            helperText={errors.region}
            label="Region"
            onChange={(event) =>
              dispatch({ type: "fieldChanged", field: "region", value: event.target.value })
            }
            placeholder="chr12:53,372,922-53,423,700"
            required
            size="small"
            value={regionInput}
          />
          <Button
            onClick={handleUseCurrentRegion}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0, minHeight: 40, whiteSpace: "nowrap" }}
          >
            Use Current Region
          </Button>
        </Stack>
        <TextField
          autoComplete="off"
          error={Boolean(errors.name)}
          fullWidth
          helperText={errors.name}
          label="ID"
          onChange={(event) =>
            dispatch({ type: "fieldChanged", field: "name", value: event.target.value })
          }
          placeholder="Create an ID for the highlight"
          required
          size="small"
          value={name}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            select
            fullWidth
            label="Type"
            sx={{ flex: 1 }}
            size="small"
            value={highlightType}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "filled" || value === "outlined")
                dispatch({ type: "typeChanged", value });
            }}
          >
            <MenuItem value="filled">Filled</MenuItem>
            <MenuItem value="outlined">Outlined</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Color"
            onChange={(event) =>
              dispatch({ type: "fieldChanged", field: "color", value: event.target.value })
            }
            size="small"
            slotProps={{ htmlInput: { "aria-label": "Highlight color" } }}
            sx={{
              flex: 1,
              "& input[type='color']": { cursor: "pointer", minHeight: 32, p: 0.5 },
            }}
            type="color"
            value={color}
          />
          <TextField
            error={Boolean(errors.opacity)}
            fullWidth
            helperText={errors.opacity}
            label="Opacity (%)"
            onChange={(event) =>
              dispatch({ type: "fieldChanged", field: "opacity", value: event.target.value })
            }
            required
            size="small"
            slotProps={{ htmlInput: { min: 0, max: 100, step: "any" } }}
            sx={{ flex: 1 }}
            type="number"
            value={opacityInput}
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="center" spacing={0.75}>
          {onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}
          {!initialHighlight ? (
            <Button onClick={() => dispatch({ type: "reset" })}>Clear</Button>
          ) : null}
          <Button
            startIcon={initialHighlight ? undefined : <AddIcon />}
            type="submit"
            variant="contained"
          >
            {initialHighlight ? "Save changes" : "Add Highlight"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
