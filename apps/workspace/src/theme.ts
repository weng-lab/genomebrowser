import { grey } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";

/**
 * Trims a text box to its cap height and baseline. A font's space above and below its
 * letters is uneven, so untrimmed text sits slightly high in whatever centers it.
 * `text-box` applies to block containers and inline boxes and is not inherited, so set it
 * on the element that directly contains the text, not on a flex container around it.
 */
export const textBoxTrim = { textBox: "trim-both cap alphabetic" } as const;

// Shells that render pages around the workspace, such as the cloud site, use this theme too.
export const theme = createTheme({
  palette: {
    // Icons use this color. MUI's default is 54% black; icons should be fully opaque.
    action: { active: grey[800] },
  },
  components: {
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
    MuiTooltip: {
      styleOverrides: {
        // Trimming removes the text's line-height padding, so restore the tooltip's height here.
        tooltip: { ...textBoxTrim, paddingTop: 8, paddingBottom: 8 },
      },
    },
  },
});
