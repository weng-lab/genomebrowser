import TextField from "@mui/material/TextField";
import { defaultScreenGraphQlEndpoint, type TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../settings/trackSettingsColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../settings/trackSettingsLayout";
import { TrackSettingsNumberField } from "../settings/trackSettingsNumberField";
import { TrackSettingsSection } from "../settings/trackSettingsSection";
import { TrackSettingsTextField } from "../settings/trackSettingsTextField";
import type { Transcript, TranscriptConfig } from "./types";

type TranscriptSettingsProps = TrackSettingsProps<TranscriptConfig, Transcript>;

export function TranscriptSettings({ track, updateTrack }: TranscriptSettingsProps) {
  const { config } = track;
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Transcript source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <EndpointField endpoint={config.endpoint} updateTrack={updateTrack} />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <AssemblyField assembly={config.assembly} updateTrack={updateTrack} />
              <VersionField updateTrack={updateTrack} version={config.version} />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Transcript highlighting">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <HighlightGeneField geneName={config.geneName} updateTrack={updateTrack} />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <TranscriptColorField
                color={config.canonicalColor}
                configKey="canonicalColor"
                label="Canonical color"
                updateTrack={updateTrack}
              />
              <TranscriptColorField
                color={config.highlightColor}
                configKey="highlightColor"
                label="Highlight color"
                updateTrack={updateTrack}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function EndpointField({
  endpoint,
  updateTrack,
}: {
  endpoint: string;
  updateTrack: TranscriptSettingsProps["updateTrack"];
}) {
  return (
    <TrackSettingsTextField
      label="Endpoint"
      normalize={(value) => value.trim()}
      placeholder={defaultScreenGraphQlEndpoint}
      required
      value={endpoint}
      validate={(value) => (value.trim() === "" ? "Enter an endpoint." : undefined)}
      onCommit={(value) => updateTrack({ config: { endpoint: value } })}
    />
  );
}

function AssemblyField({
  assembly,
  updateTrack,
}: {
  assembly: string;
  updateTrack: TranscriptSettingsProps["updateTrack"];
}) {
  return (
    <TrackSettingsTextField
      label="Assembly"
      required
      value={assembly}
      validate={(value) => (value.trim() === "" ? "Enter an assembly." : undefined)}
      onCommit={(value) => updateTrack({ config: { assembly: value } })}
    />
  );
}

function VersionField({
  updateTrack,
  version,
}: {
  updateTrack: TranscriptSettingsProps["updateTrack"];
  version: number;
}) {
  return (
    <TrackSettingsNumberField
      inputMode="numeric"
      label="Version"
      min={1}
      required
      step={1}
      value={version}
      validate={(value) =>
        Number.isInteger(value) && value > 0 ? undefined : "Enter a positive integer."
      }
      onCommit={(value) => updateTrack({ config: { version: value } })}
    />
  );
}

function HighlightGeneField({
  geneName,
  updateTrack,
}: {
  geneName: string | undefined;
  updateTrack: TranscriptSettingsProps["updateTrack"];
}) {
  return (
    <TextField
      fullWidth
      label="Highlight gene"
      size="small"
      value={geneName ?? ""}
      onChange={(event) => updateTrack({ config: { geneName: event.target.value || undefined } })}
    />
  );
}

function TranscriptColorField({
  color,
  configKey,
  label,
  updateTrack,
}: {
  color: string;
  configKey: "canonicalColor" | "highlightColor";
  label: string;
  updateTrack: TranscriptSettingsProps["updateTrack"];
}) {
  return (
    <TrackSettingsColorField
      label={label}
      value={color}
      onCommit={(value) => updateTrack({ config: { [configKey]: value } })}
    />
  );
}
