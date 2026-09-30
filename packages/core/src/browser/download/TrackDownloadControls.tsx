import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useIsInteractionBlocked } from "../state/browserContextState";
import { useTrackDownload } from "./useTrackDownload";

export function TrackDownloadControls({ trackId }: { trackId: string }) {
  const { download, isDownloading, error, rulerTrackId } = useTrackDownload(trackId);
  const [includedRulerId, setIncludedRulerId] = useState<string | null>(null);
  const isInteractionBlocked = useIsInteractionBlocked();
  const disabled = isDownloading || isInteractionBlocked;
  const hasRuler = rulerTrackId !== null;
  const isRuler = rulerTrackId === trackId;
  const includeRuler = hasRuler && !isRuler && includedRulerId === rulerTrackId;

  return (
    <Box
      component="fieldset"
      aria-label="Download track"
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        m: 0,
        minWidth: 0,
        px: 1.25,
        pb: 1.25,
      }}
    >
      <Typography component="legend" variant="subtitle2" sx={{ px: 0.5 }}>
        Download image
      </Typography>
      <Stack spacing={1}>
        <Stack
          direction="row"
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}
        >
          <FormControlLabel
            label="Include ruler"
            sx={{ m: 0 }}
            control={
              <Checkbox
                size="small"
                checked={includeRuler}
                disabled={disabled || !hasRuler || isRuler}
                onChange={(_, checked) => setIncludedRulerId(checked ? rulerTrackId : null)}
              />
            }
          />
          <ButtonGroup
            variant="outlined"
            size="small"
            aria-label="Image format"
            disabled={disabled}
          >
            <Button
              aria-label="Download track as SVG"
              onClick={() => void download("svg", { includeRuler })}
            >
              SVG
            </Button>
            <Button
              aria-label="Download track as PNG"
              onClick={() => void download("png", { includeRuler })}
            >
              PNG
            </Button>
          </ButtonGroup>
        </Stack>
        {!hasRuler && (
          <Typography variant="caption" color="text.secondary">
            Add a ruler track to include it in the image.
          </Typography>
        )}
        {isRuler && (
          <Typography variant="caption" color="text.secondary">
            This image already contains the ruler.
          </Typography>
        )}
        {isDownloading && (
          <Typography component="output" variant="caption" color="text.secondary">
            Preparing image…
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ py: 0 }}>
            {error}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
