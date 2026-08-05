import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export type TrackSettingsFieldGridProps = {
  children: ReactNode;
};

/** A responsive flow for fields that may form as many usable columns as fit. */
export function TrackSettingsFieldGrid({ children }: TrackSettingsFieldGridProps) {
  return (
    <Box
      sx={{
        alignItems: "start",
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}

/** A responsive row whose related fields stay together and stack in source order. */
export function TrackSettingsFieldRow({ children }: TrackSettingsFieldGridProps) {
  return (
    <Box
      sx={{
        alignItems: "start",
        display: "flex",
        flexWrap: "wrap",
        gap: 1.25,
        minWidth: 0,
        "& > *": {
          flex: "0 1 12rem",
          minWidth: "min(100%, 12rem)",
        },
        "& > *:not(:only-child)": {
          flexGrow: 1,
        },
      }}
    >
      {children}
    </Box>
  );
}

export type TrackSettingsFullRowProps = {
  children: ReactNode;
};

/** An item that deliberately spans every column of a settings field grid. */
export function TrackSettingsFullRow({ children }: TrackSettingsFullRowProps) {
  return <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>{children}</Box>;
}
