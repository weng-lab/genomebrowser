import TextField from "@mui/material/TextField";
import {
  defaultScreenGraphQlEndpoint,
  type TrackSettingsProps,
  type TranscriptConfig,
} from "@weng-lab/genomebrowser";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";

export function TranscriptSettings({ config, updateConfig }: TrackSettingsProps<TranscriptConfig>) {
  return (
    <>
      <TrackSettingsSection title="Transcript source">
        <TrackSettingsFieldGrid>
          <TextField
            fullWidth
            label="Endpoint"
            placeholder={defaultScreenGraphQlEndpoint}
            size="small"
            value={config.endpoint}
            onChange={(event) => {
              updateConfig({ endpoint: event.target.value || undefined });
            }}
          />
          <TextField
            fullWidth
            label="Assembly"
            size="small"
            value={config.assembly}
            onChange={(event) => {
              updateConfig({ assembly: event.target.value });
            }}
          />
          <TextField
            fullWidth
            label="Version"
            size="small"
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            type="number"
            value={config.version}
            onChange={(event) => {
              const version = Number(event.target.value);
              if (Number.isInteger(version) && version > 0) updateConfig({ version });
            }}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Transcript highlighting">
        <TrackSettingsFieldGrid>
          <TextField
            fullWidth
            label="Highlight gene"
            size="small"
            value={config.geneName ?? ""}
            onChange={(event) => {
              updateConfig({ geneName: event.target.value || undefined });
            }}
          />
          <TextField
            fullWidth
            label="Canonical color"
            placeholder="#000000"
            size="small"
            value={config.canonicalColor ?? ""}
            onChange={(event) => {
              updateConfig({ canonicalColor: event.target.value || undefined });
            }}
          />
          <TextField
            fullWidth
            label="Highlight color"
            placeholder="#000000"
            size="small"
            value={config.highlightColor ?? ""}
            onChange={(event) => {
              updateConfig({ highlightColor: event.target.value || undefined });
            }}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </>
  );
}
