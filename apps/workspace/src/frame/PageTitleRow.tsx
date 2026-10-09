import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { titleRowSx } from "./layout";

type PageTitleRowProps = {
  /** The page label, which starts the breadcrumbs. */
  label: string;
  title?: ReactNode;
  /** Set when the row sits beside the side bar, under the left panel toggle. */
  clearLeftToggle: boolean;
  /** Set when the row reaches the window's right edge, under the right panel toggle. */
  clearRightToggle: boolean;
  /** Set while a panel toggle animates, so the padding slides with the panel. */
  animate: boolean;
};

/** The center panel's title row: breadcrumbs starting with the page label. */
export function PageTitleRow({
  label,
  title,
  clearLeftToggle,
  clearRightToggle,
  animate,
}: PageTitleRowProps) {
  return (
    <Box
      component="header"
      sx={titleRowSx({ clearLeft: clearLeftToggle, clearRight: clearRightToggle, animate })}
    >
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
    </Box>
  );
}
