import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  useSettingsStore,
  useTrackStore,
  type CaveAge,
  type CaveConfig,
  type CaveNeurotransmitter,
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

export function CaveSettings() {
  return (
    <TrackSettingsLayout>
      <CaveDatasetSettings />
      <CaveColorSettings />
    </TrackSettingsLayout>
  );
}

function CaveDatasetSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const neurotransmitter = useTrackStore(
    (state) =>
      (state.getTrack(trackId)?.config as CaveConfig | undefined)?.neurotransmitter ?? "GABA",
  );
  const age = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as CaveConfig | undefined)?.age ?? "Infancy",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);

  return (
    <TrackSettingsSection title="CAVE dataset">
      <TrackSettingsFieldRow>
        <TextField
          select
          fullWidth
          label="Neurotransmitter"
          size="small"
          value={neurotransmitter}
          onChange={(event) =>
            updateTrack(trackId, {
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
          value={age}
          onChange={(event) =>
            updateTrack(trackId, { config: { age: event.target.value as CaveAge } })
          }
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

function CaveColorSettings() {
  return (
    <TrackSettingsSection title="Signal colors">
      <TrackSettingsFieldRow>
        <CaveColorField configKey="topColor" label="Top color" />
        <CaveColorField configKey="bottomColor" label="Bottom color" />
      </TrackSettingsFieldRow>
    </TrackSettingsSection>
  );
}

function CaveColorField({
  configKey,
  label,
}: {
  configKey: "topColor" | "bottomColor";
  label: string;
}) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const value = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as CaveConfig | undefined)?.[configKey] ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsColorField
      label={label}
      value={value}
      onCommit={(color) => updateTrack(trackId, { config: { [configKey]: color } })}
    />
  );
}
