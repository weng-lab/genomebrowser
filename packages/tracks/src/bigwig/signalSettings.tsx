import type { TrackMutationResult } from "@weng-lab/genomebrowser";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsRangeFields } from "../shared/settings/trackSettingsRangeFields";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import type { BigWigConfig } from "./types";

export function SignalSettings({
  config,
  onChange,
}: {
  config: BigWigConfig;
  onChange: (config: Partial<BigWigConfig>) => TrackMutationResult;
}) {
  return (
    <>
      <TrackSettingsSection title="Y-axis range">
        <TrackSettingsRangeFields
          mode="independent"
          range={config.yRange}
          onCommit={(yRange) => onChange({ yRange })}
        />
      </TrackSettingsSection>
      <TrackSettingsSection title="Rendering">
        <TrackSettingsFieldGrid>
          <FormControlLabel
            control={
              <Switch
                checked={config.fillWithZero ?? false}
                size="small"
                onChange={(event) => onChange({ fillWithZero: event.target.checked })}
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
                      onChange={(event) => onChange({ showClampIndicators: event.target.checked })}
                    />
                  }
                  label="Show clamp indicators"
                  sx={{ m: 0, minWidth: 0 }}
                />
                <TrackSettingsColorField
                  disabled={!(config.showClampIndicators ?? true)}
                  label="Clamp indicator color"
                  value={config.clampIndicatorColor}
                  onCommit={(clampIndicatorColor) => onChange({ clampIndicatorColor })}
                />
              </TrackSettingsFieldRow>
            </Box>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </>
  );
}
