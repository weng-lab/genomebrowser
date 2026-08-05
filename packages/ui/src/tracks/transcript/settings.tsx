import TextField from "@mui/material/TextField";
import {
  defaultScreenGraphQlEndpoint,
  type TrackSettingsProps,
  type TranscriptConfig,
} from "@weng-lab/genomebrowser";
import { neutralTrackColor } from "../../TrackSettings/color";
import { TrackSettingsColorField } from "../../TrackSettings/trackSettingsColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsNumberField } from "../../TrackSettings/trackSettingsNumberField";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsTextField } from "../../TrackSettings/trackSettingsTextField";

export function TranscriptSettings({ config, updateConfig }: TrackSettingsProps<TranscriptConfig>) {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Transcript source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsTextField
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
              <TrackSettingsTextField
                label="Assembly"
                required
                value={config.assembly}
                validate={(assembly) => (assembly.trim() === "" ? "Enter an assembly." : undefined)}
                onCommit={(assembly) => updateConfig({ assembly })}
              />
              <TrackSettingsNumberField
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
              <TrackSettingsColorField
                fallbackColor={neutralTrackColor}
                label="Canonical color"
                mode="optional"
                value={config.canonicalColor}
                onCommit={(canonicalColor) => updateConfig({ canonicalColor })}
              />
              <TrackSettingsColorField
                fallbackColor={neutralTrackColor}
                label="Highlight color"
                mode="optional"
                value={config.highlightColor}
                onCommit={(highlightColor) => updateConfig({ highlightColor })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
