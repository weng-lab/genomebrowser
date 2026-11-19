import type { ReactNode } from "react";
import { styled, type CSSInterpolation, type SxProps, type Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

declare module "@mui/material/styles" {
  interface Components<Theme = unknown> {
    /** Theme styles for `LabeledGroup`. `root` is the fieldset and `legend` is its title. */
    GbLabeledGroup?: {
      styleOverrides?: Partial<
        Record<
          "root" | "legend",
          CSSInterpolation | ((props: { theme: Theme }) => CSSInterpolation)
        >
      >;
    };
  }
}

export type LabeledGroupProps = {
  title: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

// Named slots let the host theme restyle the frame and title without changing every caller.
const Root = styled("fieldset", { name: "GbLabeledGroup", slot: "Root" })(({ theme }) => ({
  margin: 0,
  minWidth: 0,
  padding: theme.spacing(0.5, 1.25, 1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  flex: "0 1 auto",
  maxWidth: "100%",
  boxSizing: "border-box",
  "& button": { textTransform: "none" },
}));

// The cast keeps Typography's `component` prop, which `styled` drops from its types.
const Legend = styled(Typography, { name: "GbLabeledGroup", slot: "Legend" })(({ theme }) => ({
  padding: theme.spacing(0, 0.5),
})) as typeof Typography;

export function LabeledGroup({ title, children, sx }: LabeledGroupProps) {
  return (
    <Root sx={sx}>
      <Legend component="legend" variant="caption" color="text.secondary">
        {title}
      </Legend>
      {children}
    </Root>
  );
}
