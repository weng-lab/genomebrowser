import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackRowLayoutSettings } from "../shared/settings/trackRowLayoutSettings";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";
import type { ClinGenConfig } from "./schema";
import type { ClinGenItem } from "./types";

export function ClinGenSettings({
  track,
  updateTrack,
  ...settings
}: TrackSettingsProps<ClinGenConfig, ClinGenItem>) {
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
      >
        <TrackRowLayoutSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>
      <TrackSettingsSection title="ClinGen BigBed">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              disabled={track.source === "host"}
              value={track.config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <FormControlLabel
              label="Show labels"
              control={
                <Checkbox
                  checked={track.config.showLabels}
                  onChange={(_, showLabels) => updateTrack({ config: { showLabels } })}
                />
              }
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsNumberField
              label="Maximum detail span (bp)"
              min={1}
              step={1}
              validate={(value) =>
                Number.isSafeInteger(value) && value > 0
                  ? undefined
                  : "Enter a positive whole number"
              }
              value={track.config.maxDetailBases}
              onCommit={(maxDetailBases) => updateTrack({ config: { maxDetailBases } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
