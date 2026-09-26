import { useBasePairDetailStatus, useGenomeBrowser } from "@weng-lab/genomebrowser";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { TrackSettingsSection } from "./trackSettingsSection";

const previewBases = Array.from("ACGTGCAATGCTACGTGCAATGCTACGTGCAATGCT", (base, position) => ({
  id: `preview-base-${position}`,
  base,
}));
const colors = { A: "#248348", C: "#2864bd", G: "#a76a08", T: "#c74252" };

/** A width-aware view of the browser's shared sequence preference. */
export function BasePairDetailSettings({ unavailableReason }: { unavailableReason?: string }) {
  const { useBrowserStore } = useGenomeBrowser();
  const span = useBrowserStore((state) => state.region.end - state.region.start);
  const setDetail = useBrowserStore((state) => state.setBasePairDetail);
  const zoom = useBrowserStore((state) => state.zoom);
  const { reason, zoomTargetBases, maxReadableBases } = useBasePairDetailStatus();
  const target = zoomTargetBases ?? 1;
  const count = Math.round(8 + (16 * target) / Math.max(1, maxReadableBases));
  const label = `${target.toLocaleString("en-US")} bp`;
  return (
    <TrackSettingsSection title="Sequence letters">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
        <Typography variant="body2">
          Appear at <Box component="strong">{label}</Box>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          All tracks · fits this screen
        </Typography>
      </Box>
      <Box
        role="img"
        aria-label="Illustrative sequence preview"
        sx={{
          display: "flex",
          justifyContent: "space-evenly",
          alignItems: "center",
          overflow: "hidden",
          minHeight: 52,
          borderRadius: 1,
          bgcolor: "action.hover",
          px: 1,
        }}
      >
        {previewBases.slice(0, count).map(({ base, id }) => (
          <Box
            key={id}
            component="span"
            sx={{
              color: colors[base as keyof typeof colors],
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: 18,
              textAlign: "center",
              flex: "1 1 0",
              minWidth: 0,
            }}
          >
            {base}
          </Box>
        ))}
      </Box>
      <Box>
        <Box
          component="input"
          type="range"
          aria-label="Sequence letter zoom"
          aria-valuetext={label}
          min={1}
          max={Math.max(1, maxReadableBases)}
          value={target}
          disabled={maxReadableBases < 2}
          onChange={(event) => setDetail({ maxVisibleBases: Number(event.target.value) })}
          sx={{ width: "100%", m: 0, height: 22, accentColor: "primary.main", cursor: "pointer" }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            Larger letters
          </Typography>
          <Typography variant="caption" color="text.secondary">
            More bases
          </Typography>
        </Box>
      </Box>
      {unavailableReason || zoomTargetBases === null ? (
        <Typography variant="caption" color="text.secondary" role="status">
          {unavailableReason ?? "Widen the browser to fit letters."}
        </Typography>
      ) : (
        <Button
          fullWidth
          variant="outlined"
          size="small"
          disabled={reason === "ready"}
          onClick={() => zoom(target / span)}
        >
          {reason === "ready" ? "✓ Letter view enabled" : `Show letters · ${label}`}
        </Button>
      )}
    </TrackSettingsSection>
  );
}
