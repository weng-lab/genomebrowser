import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type {
  CaveAge,
  CaveConfig,
  CaveNeurotransmitter,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { lightenColor, neutralTrackColor } from "../../TrackSettings/color";
import { TrackSettingsColorField } from "../../TrackSettings/trackSettingsColorField";
import { TrackSettingsFieldRow } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";

const neurotransmitterOptions = [
  { label: "GABA", value: "GABA" },
  { label: "GLU", value: "GLU" },
] as const satisfies readonly { label: string; value: CaveNeurotransmitter }[];

const ageOptions = [
  { label: "Infancy", value: "Infancy" },
  { label: "Early childhood", value: "Early_Childhood" },
  { label: "Late childhood", value: "Late_Childhood" },
  { label: "Adolescence", value: "Adolescence" },
  { label: "Early adulthood", value: "Early_Adulthood" },
  { label: "Adulthood", value: "Adulthood" },
] as const satisfies readonly { label: string; value: CaveAge }[];

export function CaveSettings({ config, updateConfig }: TrackSettingsProps<CaveConfig>) {
  const bottomFallbackColor = config.bottomColor ?? neutralTrackColor;
  const topFallbackColor = lightenColor(bottomFallbackColor, 0.5);

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="CAVE dataset">
        <TrackSettingsFieldRow>
          <TextField
            select
            fullWidth
            label="Neurotransmitter"
            size="small"
            value={config.neurotransmitter}
            onChange={(event) => {
              updateConfig({ neurotransmitter: event.target.value as CaveNeurotransmitter });
            }}
          >
            {neurotransmitterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Age"
            size="small"
            value={config.age}
            onChange={(event) => {
              updateConfig({ age: event.target.value as CaveAge });
            }}
          >
            {ageOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </TrackSettingsFieldRow>
      </TrackSettingsSection>
      <TrackSettingsSection title="Signal colors">
        <TrackSettingsFieldRow>
          <TrackSettingsColorField
            fallbackColor={topFallbackColor}
            label="Top color"
            mode="optional"
            value={config.topColor}
            onCommit={(topColor) => updateConfig({ topColor })}
          />
          <TrackSettingsColorField
            fallbackColor={neutralTrackColor}
            label="Bottom color"
            mode="optional"
            value={config.bottomColor}
            onCommit={(bottomColor) => updateConfig({ bottomColor })}
          />
        </TrackSettingsFieldRow>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
