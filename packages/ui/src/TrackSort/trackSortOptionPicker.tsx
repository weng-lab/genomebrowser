import { Autocomplete, TextField } from "@mui/material";
import { useState } from "react";

type PickerOption = { id: string; label: string };

/** Single-line search for adding excluded options; each pick joins the priority list at the bottom. */
export function TrackSortOptionPicker({
  options,
  includedIds,
  onAdd,
}: {
  options: readonly PickerOption[];
  includedIds: readonly string[];
  onAdd: (id: string) => void;
}) {
  // Clear the search after each pick so several options can be added in a row.
  const [inputValue, setInputValue] = useState("");
  const included = new Set(includedIds);
  const available = options.filter(({ id }) => !included.has(id));

  return (
    <Autocomplete
      options={available}
      getOptionLabel={(option) => option.label}
      value={null}
      inputValue={inputValue}
      // Keep only typed text; picking an option would otherwise fill the field with its label.
      onInputChange={(_, value, reason) => setInputValue(reason === "input" ? value : "")}
      onChange={(_, option) => {
        if (option) onAdd(option.id);
      }}
      disabled={available.length === 0}
      size="small"
      sx={{ mb: 1.5 }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Add sort option"
          placeholder={available.length === 0 ? "All options added" : undefined}
        />
      )}
    />
  );
}
