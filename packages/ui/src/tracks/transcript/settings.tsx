import TextField from "@mui/material/TextField";
import {
  defaultScreenGraphQlEndpoint,
  useSettingsStore,
  useTrackStore,
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

export function TranscriptSettings() {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Transcript source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <EndpointField />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <AssemblyField />
              <VersionField />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Transcript highlighting">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <HighlightGeneField />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <TranscriptColorField configKey="canonicalColor" label="Canonical color" />
              <TranscriptColorField configKey="highlightColor" label="Highlight color" />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function EndpointField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const endpoint = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.endpoint ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsTextField
      label="Endpoint"
      normalize={(value) => value.trim()}
      placeholder={defaultScreenGraphQlEndpoint}
      required
      value={endpoint}
      validate={(value) => (value.trim() === "" ? "Enter an endpoint." : undefined)}
      onCommit={(value) => updateTrack(trackId, { config: { endpoint: value } })}
    />
  );
}

function AssemblyField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const assembly = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.assembly ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsTextField
      label="Assembly"
      required
      value={assembly}
      validate={(value) => (value.trim() === "" ? "Enter an assembly." : undefined)}
      onCommit={(value) => updateTrack(trackId, { config: { assembly: value } })}
    />
  );
}

function VersionField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const version = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.version ?? 1,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
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
      onCommit={(value) => updateTrack(trackId, { config: { version: value } })}
    />
  );
}

function HighlightGeneField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const geneName = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.geneName,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TextField
      fullWidth
      label="Highlight gene"
      size="small"
      value={geneName ?? ""}
      onChange={(event) =>
        updateTrack(trackId, { config: { geneName: event.target.value || undefined } })
      }
    />
  );
}

function TranscriptColorField({
  configKey,
  label,
}: {
  configKey: "canonicalColor" | "highlightColor";
  label: string;
}) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const color = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as TranscriptConfig | undefined)?.[configKey] ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsColorField
      label={label}
      value={color}
      onCommit={(value) => updateTrack(trackId, { config: { [configKey]: value } })}
    />
  );
}
