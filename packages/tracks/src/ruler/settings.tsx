import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackHeightSettings } from "../shared/settings/trackHeightSettings";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { useBrowserStore, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { useDraftController } from "../shared/settings/draftInput";
import { SequenceBase } from "./SequenceBase";
import type { RulerConfig } from "./schema";

export function RulerSettings({
  track,
  updateTrack,
  ...settings
}: TrackSettingsProps<RulerConfig>) {
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const region = useBrowserStore((state) => state.region);
  const zoom = useBrowserStore((state) => state.zoom);
  const visibility = useDraftController<number, number>({
    value: track.config.sequenceMinPixelsPerBase,
    toRaw: (value) => value,
    validate: (value) => ({ ok: true, value }),
    isEqual: Object.is,
    debounceMs: false,
    onCommit: (value) => updateTrack({ config: { sequenceMinPixelsPerBase: value } }),
  });
  const sequenceSpan = Math.floor(trackWidth / visibility.value);
  const currentSpan = region.end - region.start;

  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
      >
        <TrackHeightSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>
      <TrackSettingsSection title="Reference source">
        <TrackSettingsUrlField
          label="2bit URL"
          value={track.config.sequenceUrl ?? ""}
          disabled={track.source === "host"}
          onCommit={(value) => updateTrack({ config: { sequenceUrl: value || undefined } })}
        />
      </TrackSettingsSection>
      <TrackSettingsSection title="Sequence visibility">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="body2">Sequence resolution</Typography>
          <svg
            width={8 * visibility.value}
            height={22}
            role="img"
            aria-label={`DNA spacing preview: ${visibility.value} pixels per base`}
            style={{ flexShrink: 0, display: "block" }}
          >
            {Array.from("ACGTACGT", (base, index) => (
              <SequenceBase
                key={index}
                base={base}
                x={index * visibility.value}
                y={0}
                width={visibility.value}
                height={22}
              />
            ))}
          </svg>
        </Box>
        <Box sx={{ px: 1 }}>
          <Slider
            aria-label="Sequence resolution"
            min={5}
            max={25}
            step={1}
            value={visibility.value}
            onChange={(_, value) => {
              if (typeof value === "number") visibility.change(value);
            }}
            onChangeCommitted={(_, value) => {
              if (typeof value === "number") visibility.submit(value);
            }}
            getAriaValueText={(value) =>
              `Sequence appears at ${Math.floor(trackWidth / value)} base pairs or less`
            }
            sx={{ py: 1 }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Farther out
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Closer in
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {sequenceSpan >= 1
              ? `Sequence appears at ${sequenceSpan.toLocaleString("en-US")} bp or less.`
              : "Increase track width to show reference bases."}
          </Typography>
          <Button
            size="small"
            sx={{ flexShrink: 0 }}
            disabled={!track.config.sequenceUrl || sequenceSpan < 1 || currentSpan <= sequenceSpan}
            onClick={() => zoom(sequenceSpan / currentSpan)}
          >
            Zoom in to sequence
          </Button>
        </Box>
        {visibility.error && (
          <Typography color="error" variant="caption">
            {visibility.error}
          </Typography>
        )}
      </TrackSettingsSection>
      <TrackSettingsSection title="Sequence appearance">
        <TrackSettingsColorField
          label="Sequence highlight color"
          value={track.config.sequenceHighlightColor}
          onCommit={(value) => updateTrack({ config: { sequenceHighlightColor: value } })}
        />
        <Box>
          <FormControlLabel
            sx={{ m: 0, minWidth: 0 }}
            control={
              <Switch
                size="small"
                checked={track.config.distinguishMaskedBases}
                onChange={(_, checked) =>
                  updateTrack({ config: { distinguishMaskedBases: checked } })
                }
              />
            }
            label="Distinguish masked bases"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 1 }}>
            Show soft-masked regions in lowercase.
          </Typography>
        </Box>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
