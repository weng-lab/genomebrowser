import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { useDraftController } from "./draftInput";

export type TrackSettingsUrlFieldProps = {
  disabled?: boolean;
  label?: string;
  onCommit: (url: string) => TrackMutationResult;
  placeholder?: string;
  required?: boolean;
  value: string;
};

/** A URL input that applies its draft only when Set is activated. */
export function TrackSettingsUrlField({
  disabled = false,
  label = "URL",
  onCommit,
  placeholder,
  required = false,
  value,
}: TrackSettingsUrlFieldProps) {
  const controller = useDraftController<string, string>({
    value,
    toRaw: (url) => url,
    validate: (url) =>
      required && url.trim() === ""
        ? { ok: false, error: "Enter a URL." }
        : { ok: true, value: url },
    isEqual: Object.is,
    onCommit,
    debounceMs: false,
  });

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
      <TextField
        autoComplete="url"
        disabled={disabled}
        error={controller.error !== undefined}
        fullWidth
        helperText={controller.error}
        label={label}
        placeholder={placeholder}
        required={required}
        size="small"
        sx={{ minWidth: 0 }}
        slotProps={{ htmlInput: { inputMode: "url" } }}
        type="url"
        value={controller.value}
        onChange={(event) => controller.change(event.target.value)}
        onKeyDown={(event) => {
          if (!(event.target instanceof HTMLInputElement)) return;
          if (event.key === "Enter") event.preventDefault();
          if (event.key === "Escape") controller.keyDown(event);
        }}
      />
      <Button
        aria-label={`Set ${label}`}
        disabled={disabled}
        size="small"
        variant="outlined"
        sx={{ height: 40, flexShrink: 0 }}
        onClick={() => controller.submit(controller.value)}
      >
        Set
      </Button>
    </Box>
  );
}
