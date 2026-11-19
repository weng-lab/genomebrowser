import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

export type ControlStripProps = {
  "aria-label": string;
  /** Control groups, such as the browser toolbar's labeled sections. */
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * A row of control groups that wraps onto centered lines when it runs out of room. Groups
 * line up along their tops.
 */
export function ControlStrip({ "aria-label": ariaLabel, children, sx = [] }: ControlStripProps) {
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={[
        {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 1,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

export type ControlActionProps = {
  icon: ReactNode;
  /** The action's visible name. */
  children: string;
  onClick: () => void;
  disabled?: boolean;
};

/** A labeled action in a control group, such as Sort tracks: an icon and text in the primary color. */
export function ControlAction({ icon, children, onClick, disabled }: ControlActionProps) {
  return (
    <Button size="small" startIcon={icon} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}
