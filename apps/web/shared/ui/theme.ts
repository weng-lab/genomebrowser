import { grey } from "@mui/material/colors";
import { alpha, createTheme, type Theme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeBackground {
    // A blue-tinted surface for areas set apart from the page and paper backgrounds.
    subtle: string;
  }
}

const textPrimary = "#151822";

/**
 * Trims a text box to its cap height and baseline. A font's space above and below its
 * letters is uneven, so untrimmed text sits slightly high in whatever centers it.
 * `text-box` applies to block containers and inline boxes and is not inherited, so set it
 * on the element that directly contains the text, not on a flex container around it.
 */
export const textBoxTrim = { textBox: "trim-both cap alphabetic" } as const;

/** Hides text from view while screen readers still read it. */
export const visuallyHidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  border: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

const onPrimaryHover = (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.12);

/**
 * A navy surface, such as the side bar and the side panels' title rows. MUI text, icon
 * buttons, and inputs set their own colors, so inside the surface they inherit its light
 * text color instead. Menus and dialogs opened from it render outside it and stay light.
 */
export const primarySurfaceSx = {
  bgcolor: "primary.main",
  color: "primary.contrastText",
  "& .MuiTypography-root, & .MuiIconButton-root, & .MuiInputBase-root": { color: "inherit" },
  "& .MuiDivider-root": {
    borderColor: (theme: Theme) => alpha(theme.palette.primary.contrastText, 0.24),
  },
  "& .MuiButtonBase-root:hover, & .MuiButtonBase-root.Mui-focusVisible": {
    bgcolor: onPrimaryHover,
  },
} as const;

const separateToggleButton = ({ theme }: { theme: Theme }) => ({
  border: 0,
  margin: 0,
  borderRadius: Number(theme.shape.borderRadius) * 1.5,
});

// Shared theme for the web application and workspace.
export const theme = createTheme({
  palette: {
    primary: { main: "#171C55", dark: "#0F133E", light: "#5260A4", contrastText: "#FFFFFF" },
    secondary: { main: "#7FA6E8", dark: "#5C88D5", light: "#9DBFF8", contrastText: "#0F133E" },
    text: { primary: textPrimary, secondary: "#666970", disabled: "#9C9EA6" },
    background: { default: "#FFFFFF", paper: "#FBFBFE", subtle: "#F2F5FF" },
    divider: "#CED1D9",
    action: {
      // Icons use this color. MUI's default is 54% black; icons should be fully opaque.
      active: grey[800],
      // Neutral state layers are tinted with the text color rather than MUI's default black.
      hover: alpha(textPrimary, 0.04),
      selected: alpha(textPrimary, 0.08),
      focus: alpha(textPrimary, 0.12),
    },
  },
  components: {
    // Control groups, such as the browser toolbar sections, are paper cards.
    GbLabeledGroup: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRadius: Number(theme.shape.borderRadius) * 1.5,
        }),
      },
    },
    // Toggle groups, such as the browser's interaction modes, are separate borderless buttons.
    // The selected one sits on a rounded tint.
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { gap: 4 },
        // MUI joins grouped buttons by squaring their inner corners and overlapping their
        // borders on the first, middle, and last buttons, so each needs the separate look.
        firstButton: separateToggleButton,
        middleButton: separateToggleButton,
        lastButton: separateToggleButton,
      },
    },
    // Workspace text goes through Typography, so trimming here covers titles, labels, and body text.
    MuiTypography: {
      styleOverrides: {
        root: textBoxTrim,
        // noWrap clips overflow, and a trimmed box ends at the cap height and baseline, which
        // would cut off ascenders, descenders, and round letters. Symmetric padding gives them
        // room inside the clip without moving the text off center.
        noWrap: { paddingBlock: "0.3em" },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        // Trim the list items, which contain the inline labels. The separator is a flex
        // container by default, which text-box ignores, so make it a block.
        li: textBoxTrim,
        separator: { ...textBoxTrim, display: "block" },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        // Trimmed lines have no line-height padding between them, so the primary text's
        // descenders would touch the secondary text below. Restore a gap between the two.
        secondary: { marginTop: 6 },
      },
    },
    MuiTooltip: {
      defaultProps: { enterDelay: 500 },
      styleOverrides: {
        // Trimming removes the text's line-height padding, so restore the tooltip's height here.
        tooltip: { ...textBoxTrim, paddingTop: 8, paddingBottom: 8 },
      },
    },
  },
});
