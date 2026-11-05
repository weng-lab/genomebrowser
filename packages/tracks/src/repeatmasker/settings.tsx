import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackRowLayoutSettings } from "../shared/settings/trackRowLayoutSettings";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";
import type { RepeatMaskerConfig } from "./schema";
import type { RepeatMaskerItem } from "./types";

export function RepeatMaskerSettings({
  track,
  updateTrack,
  ...settings
}: TrackSettingsProps<RepeatMaskerConfig, RepeatMaskerItem>) {
  const { config } = track;
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
        showColor={false}
      >
        <TrackRowLayoutSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>
      <TrackSettingsSection title="RepeatMasker">
        <TextField
          select
          fullWidth
          size="small"
          label="Annotation view"
          value={config.view}
          slotProps={{ select: { native: true } }}
          onChange={(event) =>
            updateTrack({
              config: { view: event.target.value === "joined" ? "joined" : "standard" },
            })
          }
        >
          <option value="standard">Standard annotations</option>
          <option value="joined">Joined repeats</option>
        </TextField>
        <FormControlLabel
          label="Show repeat names"
          control={
            <Checkbox
              checked={config.showLabels}
              onChange={(_, showLabels) => updateTrack({ config: { showLabels } })}
            />
          }
        />
        <FormControlLabel
          label="Show strand arrows"
          control={
            <Checkbox
              checked={config.showStrandArrows}
              onChange={(_, showStrandArrows) => updateTrack({ config: { showStrandArrows } })}
            />
          }
        />
        {config.view === "standard" && track.base.display === "full" && (
          <FormControlLabel
            label="Highlight class rows on hover"
            control={
              <Checkbox
                checked={config.highlightClassOnHover}
                onChange={(_, highlightClassOnHover) =>
                  updateTrack({ config: { highlightClassOnHover } })
                }
              />
            }
          />
        )}
        {config.view === "joined" && track.base.display === "full" && (
          <FormControlLabel
            label="Show unaligned consensus extents"
            control={
              <Checkbox
                checked={config.showUnalignedExtents}
                onChange={(_, showUnalignedExtents) =>
                  updateTrack({ config: { showUnalignedExtents } })
                }
              />
            }
          />
        )}
      </TrackSettingsSection>
      <TrackSettingsSection title="Data sources and detail limit">
        <TrackSettingsUrlField
          required
          label="Standard annotations URL"
          disabled={track.source === "host"}
          value={config.sources.standard}
          onCommit={(standard) =>
            updateTrack({ config: { sources: { ...config.sources, standard } } })
          }
        />
        <TrackSettingsUrlField
          required
          label="Joined repeats URL"
          disabled={track.source === "host"}
          value={config.sources.joined}
          onCommit={(joined) => updateTrack({ config: { sources: { ...config.sources, joined } } })}
        />
        <TrackSettingsNumberField
          label="Maximum region for repeat details (bp)"
          value={config.maxDetailBases}
          min={1}
          validate={(value) =>
            Number.isSafeInteger(value) && value > 0 ? undefined : "Enter a positive whole number"
          }
          onCommit={(maxDetailBases) => updateTrack({ config: { maxDetailBases } })}
        />
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
