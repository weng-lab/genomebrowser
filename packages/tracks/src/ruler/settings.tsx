import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackHeightSettings } from "../shared/settings/trackHeightSettings";
import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import type { RulerConfig } from "./schema";

export function RulerSettings({
  track,
  updateTrack,
  ...settings
}: TrackSettingsProps<RulerConfig>) {
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
