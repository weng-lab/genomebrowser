import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type {
  BigWigConfig,
  RenderedBigWigPoint,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../../TrackSettings/trackSettingsColorField";
import { TrackSettingsRangeFields } from "../../TrackSettings/trackSettingsRangeFields";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsUrlField } from "../../TrackSettings/trackSettingsUrlField";

type YRangeSettingsProps = {
  yRange: BigWigConfig["yRange"];
  updateTrack: TrackSettingsProps<BigWigConfig, RenderedBigWigPoint>["updateTrack"];
};

export function BigWigSettings({
  track,
  updateTrack,
}: TrackSettingsProps<BigWigConfig, RenderedBigWigPoint>) {
  const { config } = track;
  const showClampIndicators = config.showClampIndicators ?? true;

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigWig source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <YRangeSettings yRange={config.yRange} updateTrack={updateTrack} />

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
                      checked={showClampIndicators}
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
                  disabled={!showClampIndicators}
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

function YRangeSettings({ yRange, updateTrack }: YRangeSettingsProps) {
  return (
    <TrackSettingsSection title="Y-axis range">
      <TrackSettingsRangeFields
        mode="independent"
        range={yRange}
        onCommit={(nextRange) => updateTrack({ config: { yRange: nextRange } })}
      />
    </TrackSettingsSection>
  );
}
