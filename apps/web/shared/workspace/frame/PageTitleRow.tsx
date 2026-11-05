import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { titleRowSx } from "./layout";

type PageTitleRowProps = {
  /** The page label, which starts the breadcrumbs. */
  label: string;
  title?: ReactNode;
  /** Replaces the breadcrumbs. It renders the page's own `h1`. */
  heading?: ReactNode;
  /** Controls at the row's right end, such as the right panel's button. */
  actions?: ReactNode;
  /** Set when the row sits beside the side bar, under the left panel toggle. */
  clearLeftToggle: boolean;
  /** Set while a panel toggle animates, so the padding slides with the panel. */
  animate: boolean;
};

/** The center panel's title row: breadcrumbs starting with the page label, or the page's own heading. */
export function PageTitleRow({
  label,
  title,
  heading,
  actions,
  clearLeftToggle,
  animate,
}: PageTitleRowProps) {
  return (
    <Box component="header" sx={titleRowSx({ clearLeft: clearLeftToggle, animate })}>
      {heading ?? (
        <Breadcrumbs aria-label="Breadcrumb" sx={{ minWidth: 0, typography: "body2" }}>
          <Typography
            variant="body2"
            component={title ? "span" : "h1"}
            display="block"
            color={title ? "text.secondary" : "text.primary"}
          >
            {label}
          </Typography>
          {title && (
            <Typography variant="body2" component="h1" color="text.primary" noWrap>
              {title}
            </Typography>
          )}
        </Breadcrumbs>
      )}
      {actions && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", pl: 1 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
