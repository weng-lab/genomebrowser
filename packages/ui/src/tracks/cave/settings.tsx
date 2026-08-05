import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type {
  CaveAge,
  CaveConfig,
  CaveNeurotransmitter,
  CaveTooltipItem,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
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

export function CaveSettings({
  track,
  updateTrack,
}: TrackSettingsProps<CaveConfig, CaveTooltipItem>) {
  const { config } = track;
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
              updateTrack({
                config: { neurotransmitter: event.target.value as CaveNeurotransmitter },
              });
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
              updateTrack({ config: { age: event.target.value as CaveAge } });
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
            label="Top color"
            value={config.topColor}
            onCommit={(topColor) => updateTrack({ config: { topColor } })}
          />
          <TrackSettingsColorField
            label="Bottom color"
            value={config.bottomColor}
            onCommit={(bottomColor) => updateTrack({ config: { bottomColor } })}
          />
        </TrackSettingsFieldRow>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
