import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { BigWigConfig, TrackSettingsProps } from "@weng-lab/genomebrowser";
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

const defaultClampIndicatorColor = "#ff0000";

type YRangeSettingsProps = {
  yRange: BigWigConfig["yRange"];
  updateConfig: TrackSettingsProps<BigWigConfig>["updateConfig"];
};

export function BigWigSettings({ config, updateConfig }: TrackSettingsProps<BigWigConfig>) {
  const showClampIndicators = config.showClampIndicators ?? true;

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigWig source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={config.url}
              onCommit={(url) => updateConfig({ url })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <YRangeSettings yRange={config.yRange} updateConfig={updateConfig} />

      <TrackSettingsSection title="Rendering">
        <TrackSettingsFieldGrid>
          <FormControlLabel
            control={
              <Switch
                checked={config.fillWithZero ?? false}
                size="small"
                onChange={(event) => updateConfig({ fillWithZero: event.target.checked })}
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
                        updateConfig({ showClampIndicators: event.target.checked })
                      }
                    />
                  }
                  label="Show clamp indicators"
                  sx={{ m: 0, minWidth: 0 }}
                />
                <TrackSettingsColorField
                  disabled={!showClampIndicators}
                  fallbackColor={defaultClampIndicatorColor}
                  label="Clamp indicator color"
                  mode="required"
                  value={config.clampIndicatorColor}
                  onCommit={(clampIndicatorColor) => updateConfig({ clampIndicatorColor })}
                />
              </TrackSettingsFieldRow>
            </Box>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function YRangeSettings({ yRange, updateConfig }: YRangeSettingsProps) {
  return (
    <TrackSettingsSection title="Y-axis range">
      <TrackSettingsRangeFields
        mode="independent"
        range={yRange}
        onCommit={(nextRange) => updateConfig({ yRange: nextRange })}
      />
    </TrackSettingsSection>
  );
}
