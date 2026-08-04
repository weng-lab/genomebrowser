import TextField from "@mui/material/TextField";
import type { BigBedConfig, TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";

export function BigBedSettings({ config, updateConfig }: TrackSettingsProps<BigBedConfig>) {
  return (
    <TrackSettingsSection title="BigBed">
      <TrackSettingsFieldGrid>
        <TextField
          autoComplete="url"
          fullWidth
          label="URL"
          size="small"
          slotProps={{ htmlInput: { inputMode: "url" } }}
          type="url"
          value={config.url}
          onChange={(event) => {
            updateConfig({ url: event.target.value });
          }}
        />
      </TrackSettingsFieldGrid>
    </TrackSettingsSection>
  );
}
