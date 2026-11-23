"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { SwatchPicker, type SwatchPickerProps } from "./SwatchPicker";

type NameAndColorProps = {
  /** The name field's accessible name and placeholder, such as "Region name". */
  nameLabel: string;
  /** The name the field starts with. */
  initialName: string;
  /** Called as the name is typed, trimmed, unless it is blank, which keeps the last name. */
  onRename: (name: string) => void;
  /** Called by Enter in the name field, such as to close the menu. */
  onDone: () => void;
  color: Omit<SwatchPickerProps, "allowCustom">;
};

/**
 * The top of an actions popover: a name field, which has focus when it opens, then a color
 * row with a custom color. Both apply as they change.
 */
export function NameAndColor({
  nameLabel,
  initialName,
  onRename,
  onDone,
  color,
}: NameAndColorProps) {
  // A draft, so clearing the field keeps the name until a new one is typed.
  const [name, setName] = useState(initialName);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1.5, pb: 1 }}>
      <TextField
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          const trimmed = event.target.value.trim();
          if (trimmed) onRename(trimmed);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") onDone();
        }}
        placeholder={nameLabel}
        size="small"
        fullWidth
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- The user's click opened the popover, which starts at the name.
        autoFocus
        slotProps={{ htmlInput: { "aria-label": nameLabel, autoComplete: "off" } }}
      />
      <SwatchPicker {...color} allowCustom />
    </Box>
  );
}
