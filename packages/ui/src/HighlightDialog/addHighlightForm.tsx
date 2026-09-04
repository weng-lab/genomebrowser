import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { useState, type SyntheticEvent } from "react";
import { formatRegion, parseHighlightRegion } from "./highlightRegion";

const defaultColor = "#3366cc";

type FormErrors = Partial<Record<"name" | "region" | "opacity", string>>;

export function AddHighlightForm({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const useBrowserStore = browserStore;
  const assembly = useBrowserStore((state) => state.assembly);
  const currentRegion = useBrowserStore((state) => state.region);
  const highlights = useBrowserStore((state) => state.highlights);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const [name, setName] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [opacityInput, setOpacityInput] = useState("20");
  const [errors, setErrors] = useState<FormErrors>({});

  function handleUseCurrentRegion() {
    setRegionInput(formatRegion(currentRegion));
    setErrors((current) => ({ ...current, region: undefined }));
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const nextErrors: FormErrors = {};
    if (!trimmedName) {
      nextErrors.name = "ID is required.";
    } else if (highlights.some((highlight) => highlight.id === trimmedName)) {
      nextErrors.name = "Highlight IDs must be unique.";
    }

    const regionResult = parseHighlightRegion(regionInput, assembly);
    if (!regionResult.ok) nextErrors.region = regionResult.error;

    const opacity = Number(opacityInput);
    if (!opacityInput.trim() || !Number.isFinite(opacity) || opacity < 0 || opacity > 100) {
      nextErrors.opacity = "Enter a number from 0 to 100.";
    }

    setErrors(nextErrors);
    if (!trimmedName || !regionResult.ok || Object.keys(nextErrors).length > 0) return;

    addHighlight({ id: trimmedName, region: regionResult.region, color, opacity: opacity / 100 });
    setName("");
    setRegionInput("");
    setColor(defaultColor);
    setOpacityInput("20");
  }

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        "&::before": { display: "none" },
        bgcolor: "action.selected",
        borderRadius: "8px !important",
        mt: 1.25,
        overflow: "hidden",
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, px: 1.5 }}>
        <Box sx={{ alignItems: "center", display: "flex", gap: 0.75 }}>
          <AddIcon color="action" />
          <Typography fontWeight={700}>Add New Highlight</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: "background.paper", p: 1.5 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={1.25}>
            <TextField
              autoComplete="off"
              error={Boolean(errors.region)}
              fullWidth
              helperText={errors.region}
              label="Region"
              onChange={(event) => {
                setRegionInput(event.target.value);
                setErrors((current) => ({ ...current, region: undefined }));
              }}
              placeholder="chr12:53,372,922-53,423,700"
              required
              size="small"
              value={regionInput}
            />
            <TextField
              autoComplete="off"
              error={Boolean(errors.name)}
              fullWidth
              helperText={errors.name}
              label="ID"
              onChange={(event) => {
                setName(event.target.value);
                setErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="Create an ID for the highlight"
              required
              size="small"
              value={name}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                fullWidth
                label="Color"
                onChange={(event) => setColor(event.target.value)}
                size="small"
                slotProps={{ htmlInput: { "aria-label": "Highlight color" } }}
                sx={{
                  flex: 1,
                  "& input[type='color']": { cursor: "pointer", minHeight: 32, p: 0.5 },
                }}
                type="color"
                value={color}
              />
              <TextField
                error={Boolean(errors.opacity)}
                fullWidth
                helperText={errors.opacity}
                label="Opacity (%)"
                onChange={(event) => {
                  setOpacityInput(event.target.value);
                  setErrors((current) => ({ ...current, opacity: undefined }));
                }}
                required
                size="small"
                slotProps={{ htmlInput: { min: 0, max: 100, step: "any" } }}
                sx={{ flex: 1 }}
                type="number"
                value={opacityInput}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="center" spacing={0.75}>
              <Button onClick={handleUseCurrentRegion} variant="outlined">
                Use Current Region
              </Button>
              <Button startIcon={<AddIcon />} type="submit" variant="contained">
                Add Highlight
              </Button>
            </Stack>
          </Stack>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
