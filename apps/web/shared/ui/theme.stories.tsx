import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, type PaletteColor } from "@mui/material/styles";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** The theme's colors, by palette group, with each key and value. */
function Palette() {
  const { palette } = useTheme();
  const tones = ({ main, dark, light, contrastText }: PaletteColor) => ({
    main,
    dark,
    light,
    contrastText,
  });
  const groups: [string, Record<string, string>][] = [
    ["Text", { ...palette.text }],
    ["Primary", tones(palette.primary)],
    ["Secondary", tones(palette.secondary)],
    ["Background", { ...palette.background, divider: palette.divider }],
  ];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {groups.map(([name, colors]) => (
        <Box key={name}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            {name}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {Object.entries(colors).map(([key, color]) => (
              <Box key={key} sx={{ width: 132 }}>
                <Box
                  sx={{
                    height: 56,
                    bgcolor: color,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1.5,
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {key}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.75 }}
                >
                  {color}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

const meta = {
  title: "Theme/Palette",
  component: Palette,
} satisfies Meta<typeof Palette>;

export default meta;

export const Colors: StoryObj<typeof meta> = {};
