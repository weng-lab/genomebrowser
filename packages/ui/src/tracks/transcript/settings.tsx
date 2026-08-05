import TextField from "@mui/material/TextField";
import {
  defaultScreenGraphQlEndpoint,
  type TrackSettingsProps,
  type Transcript,
  type TranscriptConfig,
} from "@weng-lab/genomebrowser";
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

export function TranscriptSettings({
  track,
  updateTrack,
}: TrackSettingsProps<TranscriptConfig, Transcript>) {
  const { config } = track;
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
              onCommit={(endpoint) => updateTrack({ config: { endpoint } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <TrackSettingsTextField
                label="Assembly"
                required
                value={config.assembly}
                validate={(assembly) => (assembly.trim() === "" ? "Enter an assembly." : undefined)}
                onCommit={(assembly) => updateTrack({ config: { assembly } })}
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
                onCommit={(version) => updateTrack({ config: { version } })}
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
                updateTrack({ config: { geneName: event.target.value || undefined } });
              }}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <TrackSettingsColorField
                label="Canonical color"
                value={config.canonicalColor}
                onCommit={(canonicalColor) => updateTrack({ config: { canonicalColor } })}
              />
              <TrackSettingsColorField
                label="Highlight color"
                value={config.highlightColor}
                onCommit={(highlightColor) => updateTrack({ config: { highlightColor } })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
