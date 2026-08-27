import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsRangeFields } from "../shared/settings/trackSettingsRangeFields";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import type { SignalPoint } from "../shared/signal";
import type { BigWigConfig } from "./types";

type Props = TrackSettingsProps<BigWigConfig, SignalPoint>;
export function BigWigSettings({ track, updateTrack }: Props) {
  const { config } = track;
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigWig source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              disabled={track.source === "host"}
              required
              value={config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Y-axis range">
        <TrackSettingsRangeFields
          mode="independent"
          range={config.yRange}
          onCommit={(yRange) => updateTrack({ config: { yRange } })}
        />
      </TrackSettingsSection>
      <TrackSettingsSection title="Rendering">
        <TrackSettingsFieldGrid>
          <FormControlLabel
            control={
              <Switch
                checked={config.fillWithZero ?? false}
                size="small"
                onChange={(event) =>
                  updateTrack({ config: { fillWithZero: event.target.checked } })
                }
              />
            }
            label="Fill missing values with zero"
            sx={{ m: 0, minWidth: 0 }}
          />
          <TrackSettingsFullRow>
            <Box sx={{ borderLeft: 2, borderColor: "divider", pl: 1 }}>
              <TrackSettingsFieldRow>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showClampIndicators ?? true}
                      size="small"
                      onChange={(event) =>
                        updateTrack({ config: { showClampIndicators: event.target.checked } })
                      }
                    />
                  }
                  label="Show clamp indicators"
                  sx={{ m: 0, minWidth: 0 }}
                />
                <TrackSettingsColorField
                  disabled={!(config.showClampIndicators ?? true)}
                  label="Clamp indicator color"
                  value={config.clampIndicatorColor}
                  onCommit={(clampIndicatorColor) =>
                    updateTrack({ config: { clampIndicatorColor } })
                  }
                />
              </TrackSettingsFieldRow>
            </Box>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
