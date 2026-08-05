import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type {
  CaveAge,
  CaveConfig,
  CaveNeurotransmitter,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { OptionalTrackColorField } from "../../TrackSettings/optionalTrackColorField";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
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
  return (
    <>
      <TrackSettingsSection title="CAVE dataset">
        <TrackSettingsFieldGrid>
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
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Signal colors">
        <TrackSettingsFieldGrid>
          <OptionalTrackColorField
            label="Top color"
            placeholder="Derived from bottom color"
            value={config.topColor}
            onChange={(topColor) => updateConfig({ topColor })}
          />
          <OptionalTrackColorField
            label="Bottom color"
            placeholder="Track color"
            value={config.bottomColor}
            onChange={(bottomColor) => updateConfig({ bottomColor })}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </>
  );
}
