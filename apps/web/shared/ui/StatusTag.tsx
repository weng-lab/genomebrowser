import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, type Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { visuallyHidden } from "./theme";

export type StatusTone = "neutral" | "success" | "warning" | "error";

export type StatusTagProps = {
  label: string;
  /** Gray for neutral; otherwise the palette color of that name. Defaults to neutral. */
  tone?: StatusTone;
  /** Shows a spinner instead of the dot, while work is in progress. */
  busy?: boolean;
  /**
   * A media or container query where only the dot or spinner shows, such as a narrow
   * title row. The label stays readable by screen readers.
   */
  compactWhen?: string;
};

/**
 * A small bordered tag with a dot, or a spinner while busy, and a short label. It announces
 * label changes politely to screen readers.
 */
export function StatusTag({ label, tone = "neutral", busy = false, compactWhen }: StatusTagProps) {
  const color = tone === "neutral" ? undefined : tone;
  const tint = (theme: Theme, opacity: number) =>
    alpha(color ? theme.palette[color].main : theme.palette.text.primary, opacity);
  return (
    <Box
      component="output"
      aria-live="polite"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        boxSizing: "border-box",
        height: 28,
        px: 1.25,
        border: 1,
        borderRadius: 1.5,
        flexShrink: 0,
        // A light tint of the tone's color, with darker text and a stronger tint for the border.
        color: color ? `${color}.dark` : "text.secondary",
        bgcolor: (theme: Theme) => tint(theme, 0.1),
        borderColor: (theme: Theme) => tint(theme, 0.24),
        ...(compactWhen && { [compactWhen]: { px: 1 } }),
      }}
    >
      {busy ? (
        <CircularProgress size={10} thickness={6} color="inherit" />
      ) : (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: color ? `${color}.main` : "text.secondary",
          }}
        />
      )}
      <Typography
        variant="body2"
        noWrap
        sx={compactWhen ? { [compactWhen]: visuallyHidden } : undefined}
      >
        {label}
      </Typography>
    </Box>
  );
}
