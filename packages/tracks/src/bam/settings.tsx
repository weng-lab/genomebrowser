import { BasePairDetailSettings } from "../shared/settings/basePairDetailSettings";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
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
  // Track patches are shallow, so nested groups are sent whole.
  const updateAlignments = (alignments: Partial<BamConfig["alignments"]>) =>
    updateTrack({
      config: { alignments: { ...config.alignments, ...alignments } },
    });
  const updateFilters = (filters: Partial<BamConfig["filters"]>) =>
    updateTrack({ config: { filters: { ...config.filters, ...filters } } });
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={displayOptions}
        showColor={false}
      >
        <TrackSettingsFieldRow>
          <TrackSettingsNumberField
            label="Row height"
            min={1}
            value={config.alignments.rowHeight}
            validate={(value) => (value >= 1 ? undefined : "Enter at least 1 pixel.")}
            onCommit={(rowHeight) => updateAlignments({ rowHeight })}
          />
          <TrackSettingsColorField
            label="Forward color"
            value={config.alignments.forwardColor}
            onCommit={(forwardColor) => updateAlignments({ forwardColor })}
          />
          <TrackSettingsColorField
            label="Reverse color"
            value={config.alignments.reverseColor}
            onCommit={(reverseColor) => updateAlignments({ reverseColor })}
          />
        </TrackSettingsFieldRow>
      </TrackBaseSettings>
      <BasePairDetailSettings
        unavailableReason={
          track.base.display !== "pack" && track.base.display !== "full"
            ? "Choose Pack or Full display above to show letters on this track."
            : config.alignments.rowHeight < 10
              ? "Increase row height to at least 10 pixels to show letters on this track."
              : undefined
        }
      />

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
                updateTrack({
                  config: { sequenceUrl: sequenceUrl.trim() || undefined },
                })
              }
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Alignment display">
        <TrackSettingsFieldRow>
          <TrackSettingsNumberField
            label="Minimum mapping quality"
            min={0}
            value={config.filters.minimumMappingQuality}
            validate={(value) =>
              Number.isInteger(value) && value >= 0 && value <= 254
                ? undefined
                : "Enter an integer from 0 to 254."
            }
            onCommit={(minimumMappingQuality) => updateFilters({ minimumMappingQuality })}
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
        <FormControlLabel
          label="Show duplicate reads"
          control={
            <Checkbox
              checked={config.filters.includeDuplicates}
              onChange={(_, includeDuplicates) => updateFilters({ includeDuplicates })}
            />
          }
        />
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
