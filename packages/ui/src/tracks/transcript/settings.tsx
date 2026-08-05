import TextField from "@mui/material/TextField";
import {
  defaultScreenGraphQlEndpoint,
  type TrackSettingsProps,
  type TranscriptConfig,
} from "@weng-lab/genomebrowser";
import { DraftNumberField } from "../../TrackSettings/draftNumberField";
import { DraftTextField } from "../../TrackSettings/draftTextField";
import { OptionalTrackColorField } from "../../TrackSettings/optionalTrackColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";

export function TranscriptSettings({ config, updateConfig }: TrackSettingsProps<TranscriptConfig>) {
  return (
    <>
      <TrackSettingsSection title="Transcript source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <DraftTextField
              label="Endpoint"
              placeholder={defaultScreenGraphQlEndpoint}
              required
              value={config.endpoint}
              normalize={(endpoint) => endpoint.trim()}
              validate={(endpoint) => (endpoint.trim() === "" ? "Enter an endpoint." : undefined)}
              onCommit={(endpoint) => updateConfig({ endpoint })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <DraftTextField
                label="Assembly"
                required
                value={config.assembly}
                validate={(assembly) => (assembly.trim() === "" ? "Enter an assembly." : undefined)}
                onCommit={(assembly) => updateConfig({ assembly })}
              />
              <DraftNumberField
                inputMode="numeric"
                label="Version"
                min={1}
                required
                step={1}
                value={config.version}
                validate={(version) =>
                  Number.isInteger(version) && version > 0 ? undefined : "Enter a positive integer."
                }
                onCommit={(version) => updateConfig({ version })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Transcript highlighting">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TextField
              fullWidth
              label="Highlight gene"
              size="small"
              value={config.geneName ?? ""}
              onChange={(event) => {
                updateConfig({ geneName: event.target.value || undefined });
              }}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <OptionalTrackColorField
                label="Canonical color"
                placeholder="#000000"
                value={config.canonicalColor}
                onChange={(canonicalColor) => updateConfig({ canonicalColor })}
              />
              <OptionalTrackColorField
                label="Highlight color"
                placeholder="#000000"
                value={config.highlightColor}
                onChange={(highlightColor) => updateConfig({ highlightColor })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </>
  );
}
