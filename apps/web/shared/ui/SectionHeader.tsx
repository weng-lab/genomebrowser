import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode, Ref } from "react";

export type SectionAction = {
  /** The button's name, which its tooltip shows. */
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  /**
   * For a button that shows and hides part of the section, such as a form: whether it is
   * shown, which also tints the button, and the shown part's ID.
   */
  expanded?: boolean;
  controls?: string;
  ref?: Ref<HTMLButtonElement>;
};

export type SectionHeaderProps = {
  title: string;
  /** A count of what the section holds, shown after the title, such as its items. */
  count?: number;
  /** The heading's level. Defaults to `h3`, for a section inside an `h2` panel. */
  component?: "h2" | "h3" | "h4";
  /** Icon buttons at the right end, in order. */
  actions?: readonly SectionAction[];
};

/** A section's heading, with its named icon actions at the right end. */
export function SectionHeader({
  title,
  count,
  component = "h3",
  actions = [],
}: SectionHeaderProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minHeight: 40 }}>
      <Typography
        variant="subtitle1"
        component={component}
        noWrap
        sx={{ flexGrow: 1, fontWeight: "fontWeightMedium" }}
      >
        {title}
        {count !== undefined && (
          <Box
            component="span"
            sx={{ ml: 1.5, typography: "body2", fontWeight: "fontWeightRegular" }}
          >
            {count}
          </Box>
        )}
      </Typography>
      {actions.map(({ label, icon, onClick, expanded, controls, ref }) => (
        <Tooltip key={label} title={label}>
          <IconButton
            ref={ref}
            aria-label={label}
            aria-expanded={expanded}
            aria-controls={expanded ? controls : undefined}
            onClick={onClick}
            sx={actionSx}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
}

/** A rounded square, tinted while the part it shows is open. */
const actionSx = {
  p: 0.75,
  borderRadius: 1.5,
  color: "primary.main",
  "& svg": { fontSize: 22 },
  "&[aria-expanded='true']": { bgcolor: "action.selected", color: "text.secondary" },
} as const;
