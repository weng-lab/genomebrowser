import { useBasePairDetailStatus, useGenomeBrowser } from "@weng-lab/genomebrowser";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { TrackSettingsSection } from "./trackSettingsSection";
import { parseFiniteNumber, useDraftController } from "./draftInput";

/** One browser setting, offered in each track panel where users look for letter controls. */
export function BasePairDetailSettings({ unavailableReason }: { unavailableReason?: string }) {
  const { useBrowserStore } = useGenomeBrowser();
  const maximum = useBrowserStore((state) => state.basePairDetail.maxVisibleBases);
  const span = useBrowserStore((state) => state.region.end - state.region.start);
  const setDetail = useBrowserStore((state) => state.setBasePairDetail);
  const zoom = useBrowserStore((state) => state.zoom);
  const { reason, zoomTargetBases } = useBasePairDetailStatus();
  const input = useDraftController({
    value: maximum,
    toRaw: String,
    isEqual: Object.is,
    debounceMs: false,
    validate: (raw: string) => {
      const parsed = parseFiniteNumber(raw);
      if (!parsed.ok) return parsed;
      return Number.isSafeInteger(parsed.value) && parsed.value > 0
        ? parsed
        : { ok: false as const, error: "Enter a whole number of bases greater than zero." };
    },
    onCommit: (maxVisibleBases) => setDetail({ maxVisibleBases }),
  });
  const message =
    unavailableReason ??
    (reason === "viewport"
      ? zoomTargetBases === null
        ? "Widen the browser to make room for letters."
        : zoomTargetBases < maximum
          ? `Zoom in to ${zoomTargetBases.toLocaleString("en-US")} bp or less for readable letters at this width.`
          : `Zoom in to ${maximum.toLocaleString("en-US")} bp or less to enable letters.`
      : reason === "width"
        ? zoomTargetBases === null
          ? "Widen the browser to make room for letters."
          : "Letters need more room. Zoom in or widen the browser."
        : "This view allows letters when sequence data is available.");
  const canZoom =
    !unavailableReason && reason !== "ready" && zoomTargetBases !== null && zoomTargetBases < span;

  return (
    <TrackSettingsSection title="Base-pair detail">
      <Typography variant="body2" color="text.secondary">
        <Box component="strong" sx={{ color: "text.primary", fontWeight: 600 }}>
          Shared across all tracks.
        </Box>{" "}
        Changes here also apply to ruler, BAM and nucleotide signal tracks in this browser.
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="Show letters when viewing up to"
        value={input.value}
        error={input.error !== undefined}
        helperText={input.error ?? "Letters also need enough space to be readable."}
        slotProps={{
          htmlInput: { inputMode: "numeric" },
          input: { endAdornment: <InputAdornment position="end">bp</InputAdornment> },
        }}
        onChange={(event) => input.change(event.target.value)}
        onBlur={input.blur}
        onKeyDown={input.keyDown}
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          borderTop: 1,
          borderColor: "divider",
          pt: 1,
        }}
      >
        <Box role="status" sx={{ flex: "1 1 220px", minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Viewing {span.toLocaleString("en-US")} bp
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {message}
          </Typography>
        </Box>
        {canZoom && (
          <Button size="small" variant="outlined" onClick={() => zoom(zoomTargetBases / span)}>
            Zoom to letters
          </Button>
        )}
      </Box>
      <Box
        component="details"
        sx={{
          fontSize: "0.75rem",
          color: "text.secondary",
          "& summary": { cursor: "pointer", width: "fit-content" },
        }}
      >
        <summary>How letter display works</summary>
        <Typography variant="caption" component="p" sx={{ mb: 0, mt: 0.5 }}>
          Zoom controls how many bases are visible. Letters hide when space becomes too tight and
          return when there is comfortably enough room, so small resizes do not repeatedly switch
          them on and off.
        </Typography>
      </Box>
    </TrackSettingsSection>
  );
}
