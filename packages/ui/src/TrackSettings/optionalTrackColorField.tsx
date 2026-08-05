import TextField from "@mui/material/TextField";

export type OptionalTrackColorFieldProps = {
  label: string;
  placeholder: string;
  value: string | undefined;
  onChange: (color: string | undefined) => void;
};

/** A text color override that clears back to its caller-defined default. */
export function OptionalTrackColorField({
  label,
  placeholder,
  value,
  onChange,
}: OptionalTrackColorFieldProps) {
  return (
    <TextField
      fullWidth
      label={label}
      placeholder={placeholder}
      size="small"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || undefined)}
    />
  );
}
