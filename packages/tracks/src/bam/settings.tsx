import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";
import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";
import type { BamConfig } from "./types";

export function BamSettings({
  track,
  updateTrack,
  displayOptions,
}: TrackSettingsProps<BamConfig, BamRecord>) {
  const config = track.config;
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings track={track} updateTrack={updateTrack} displayOptions={displayOptions}>
        <TrackSettingsFieldRow>
          <TrackSettingsNumberField
            label="Row height"
            min={1}
            value={config.rowHeight}
            validate={(value) => (value >= 1 ? undefined : "Enter at least 1 pixel.")}
            onCommit={(rowHeight) => updateTrack({ config: { rowHeight } })}
          />
          <TrackSettingsColorField
            label="Reverse strand color"
            value={config.reverseColor}
            onCommit={(reverseColor) => updateTrack({ config: { reverseColor } })}
          />
        </TrackSettingsFieldRow>
        <Typography variant="caption">
          Color sets the forward strand. Squish uses half the row height; track height follows
          visible rows.
        </Typography>
      </TrackBaseSettings>
      <TrackSettingsSection title="BAM source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="BAM URL"
              required
              disabled={track.source === "host"}
              value={config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="BAI URL"
              required
              disabled={track.source === "host"}
              value={config.indexUrl}
              onCommit={(indexUrl) => updateTrack({ config: { indexUrl } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="Reference 2bit URL"
              disabled={track.source === "host"}
              value={config.sequenceUrl ?? ""}
              onCommit={(sequenceUrl) =>
                updateTrack({ config: { sequenceUrl: sequenceUrl.trim() || undefined } })
              }
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
        <Typography variant="caption">
          An optional reference from the same assembly identifies mismatching bases when zoomed in.
          BAM names may differ by a chr prefix; reference sequence names must match the browser.
        </Typography>
      </TrackSettingsSection>
      <TrackSettingsSection title="Alignment display">
        <TrackSettingsFieldRow>
          <TrackSettingsNumberField
            label="Minimum mapping quality"
            min={0}
            value={config.minimumMappingQuality}
            validate={(value) =>
              Number.isInteger(value) && value >= 0 && value <= 254
                ? undefined
                : "Enter an integer from 0 to 254."
            }
            onCommit={(minimumMappingQuality) => updateTrack({ config: { minimumMappingQuality } })}
          />
          <TrackSettingsNumberField
            label="Maximum window (bp)"
            min={1}
            value={config.maxWindow}
            validate={(value) =>
              Number.isInteger(value) && value >= 1 && value <= 100_000
                ? undefined
                : "Enter an integer from 1 to 100000."
            }
            onCommit={(maxWindow) => updateTrack({ config: { maxWindow } })}
          />
        </TrackSettingsFieldRow>
        <TrackSettingsFieldRow>
          <TrackSettingsNumberField
            label="Sequence letters maximum window (bp)"
            min={1}
            value={config.sequenceMaxWindow}
            validate={(value) =>
              Number.isInteger(value) && value >= 1 && value <= 100_000
                ? undefined
                : "Enter an integer from 1 to 100000."
            }
            onCommit={(sequenceMaxWindow) => updateTrack({ config: { sequenceMaxWindow } })}
          />
        </TrackSettingsFieldRow>
        <Typography variant="caption">
          Letters appear at this visible span or less in pack/full mode with row height at least 10
          pixels.
        </Typography>
        <FormControlLabel
          label="Show duplicate reads"
          control={
            <Checkbox
              checked={config.showDuplicates}
              onChange={(_, showDuplicates) => updateTrack({ config: { showDuplicates } })}
            />
          }
        />
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
