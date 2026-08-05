import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import { DraftTextField } from "./draftTextField";

export type TrackSourceUrlFieldProps = {
  label?: string;
  onCommit: (url: string) => TrackMutationResult;
  placeholder?: string;
  required?: boolean;
  value: string;
};

/** A URL input for direct track data sources. */
export function TrackSourceUrlField({
  label = "URL",
  onCommit,
  placeholder,
  required = false,
  value,
}: TrackSourceUrlFieldProps) {
  return (
    <DraftTextField
      autoComplete="url"
      inputMode="url"
      label={label}
      placeholder={placeholder}
      required={required}
      type="url"
      value={value}
      validate={(url) => (required && url.trim() === "" ? "Enter a URL." : undefined)}
      onCommit={onCommit}
    />
  );
}
