import Typography from "@mui/material/Typography";
import type { ElementType, ReactNode } from "react";

export type SectionLabelProps = {
  /** Set so a list can name itself with `aria-labelledby`. */
  id?: string;
  /** A heading level when the label heads a page section, such as `h2`. Defaults to `span`. */
  component?: ElementType;
  children: ReactNode;
};

/**
 * Bold gray capitals above a list, such as "Recent sessions". Its padding lines it up with
 * the text of dense list rows below it.
 */
export function SectionLabel({ id, component = "span", children }: SectionLabelProps) {
  return (
    <Typography
      id={id}
      component={component}
      variant="caption"
      display="block"
      color="text.secondary"
      sx={labelSx}
    >
      {children}
    </Typography>
  );
}

const labelSx = {
  px: 1.5,
  pt: 1.25,
  pb: 0.75,
  fontWeight: "fontWeightBold",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
} as const;
