import TextField from "@mui/material/TextField";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import type { GeneConfig, GeneFeature } from "./types";

export function GeneSettings({ track, updateTrack }: TrackSettingsProps<GeneConfig, GeneFeature>) {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigGenePred">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={track.config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Gene highlighting">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TextField
              fullWidth
              label="Highlight gene"
              size="small"
              value={track.config.geneName ?? ""}
              onChange={(event) =>
                updateTrack({ config: { geneName: event.target.value || undefined } })
              }
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <TrackSettingsColorField
                label="Highlight color"
                value={track.config.highlightColor}
                onCommit={(highlightColor) => updateTrack({ config: { highlightColor } })}
              />
              <TrackSettingsColorField
                label="Canonical transcript color"
                value={track.config.canonicalColor}
                onCommit={(canonicalColor) => updateTrack({ config: { canonicalColor } })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
