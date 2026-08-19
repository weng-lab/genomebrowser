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

type CaveSettingsProps = TrackSettingsProps<CaveConfig, CaveTooltipItem>;

export function CaveSettings({ track, updateTrack }: CaveSettingsProps) {
  return (
    <TrackSettingsLayout>
      <CaveDatasetSettings config={track.config} updateTrack={updateTrack} />
      <CaveColorSettings config={track.config} updateTrack={updateTrack} />
    </TrackSettingsLayout>
  );
}

function CaveDatasetSettings({
  config,
  updateTrack,
}: {
  config: Readonly<CaveConfig>;
  updateTrack: CaveSettingsProps["updateTrack"];
}) {
  return (
    <TrackSettingsSection title="CAVE dataset">
      <TrackSettingsFieldRow>
        <TextField
          select
          fullWidth
          label="Neurotransmitter"
          size="small"
          value={config.neurotransmitter}
          onChange={(event) =>
            updateTrack({
              config: { neurotransmitter: event.target.value as CaveNeurotransmitter },
            })
          }
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
          onChange={(event) => updateTrack({ config: { age: event.target.value as CaveAge } })}
        >
          {ageOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </TrackSettingsFieldRow>
    </TrackSettingsSection>
  );
}

function CaveColorSettings({
  config,
  updateTrack,
}: {
  config: Readonly<CaveConfig>;
  updateTrack: CaveSettingsProps["updateTrack"];
}) {
  return (
    <TrackSettingsSection title="Signal colors">
      <TrackSettingsFieldRow>
        <CaveColorField
          configKey="topColor"
          label="Top color"
          updateTrack={updateTrack}
          value={config.topColor}
        />
        <CaveColorField
          configKey="bottomColor"
          label="Bottom color"
          updateTrack={updateTrack}
          value={config.bottomColor}
        />
      </TrackSettingsFieldRow>
    </TrackSettingsSection>
  );
}

function CaveColorField({
  configKey,
  label,
  updateTrack,
  value,
}: {
  configKey: "topColor" | "bottomColor";
  label: string;
  updateTrack: CaveSettingsProps["updateTrack"];
  value: string;
}) {
  return (
    <TrackSettingsColorField
      label={label}
      value={value}
      onCommit={(color) => updateTrack({ config: { [configKey]: color } })}
    />
  );
}
