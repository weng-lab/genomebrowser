import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import { GenomeBrowser, type GenomeBrowserProps } from "@weng-lab/genomebrowser";

type SizingExampleProps = Pick<GenomeBrowserProps, "browserStore" | "trackStore"> & {
  initialSizing: "fixed" | "responsive";
  initialScale: number;
  containerWidth: number;
};

export function SizingExample({
  initialSizing,
  initialScale,
  containerWidth,
  ...stores
}: SizingExampleProps) {
  const [sizing, setSizing] = useState(initialSizing);
  const [scale, setScale] = useState(initialScale);
  const labelId = useId();
  return (
    <Stack component="section" spacing={1} sx={{ minWidth: 0 }}>
      <Typography component="h2" variant="h6">
        {initialSizing === "fixed" ? "Fixed" : "Responsive"} · {Math.round(initialScale * 100)}%
        preset
      </Typography>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          select
          size="small"
          label="Sizing"
          value={sizing}
          onChange={(event) => setSizing(event.target.value as typeof sizing)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="fixed">Fixed</MenuItem>
          <MenuItem value="responsive">Responsive</MenuItem>
        </TextField>
        <Box sx={{ width: 240, maxWidth: "100%" }}>
          <Typography id={labelId} variant="body2">
            Whole-browser scale: {Math.round(scale * 100)}%
          </Typography>
          <Slider
            aria-labelledby={labelId}
            min={0.5}
            max={2}
            step={0.05}
            value={scale}
            onChange={(_, value) => setScale(value as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
          />
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {sizing === "fixed"
          ? "800 logical units wide; scroll if it exceeds the container."
          : "Follows the container; increasing scale leaves less logical space for detail."}
      </Typography>
      <Box sx={{ width: containerWidth, maxWidth: "100%", minWidth: 0 }}>
        <GenomeBrowser {...stores} sizing={sizing} scale={scale} />
      </Box>
    </Stack>
  );
}
