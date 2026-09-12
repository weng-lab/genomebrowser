import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type {
  TrackBaseUpdate,
  TrackMutationResult,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { useState, type ReactNode } from "react";
import { TrackSettingsColorField } from "./trackSettingsColorField";
import { TrackSettingsTextField } from "./trackSettingsTextField";
import { TrackSettingsFieldRow } from "./trackSettingsFieldGrid";
import { TrackSettingsSection } from "./trackSettingsSection";

export type TrackBaseSettingsProps = {
  track: { base: TrackSettingsProps<unknown>["track"]["base"] };
  displayOptions: readonly string[];
  updateTrack: (update: { base: TrackBaseUpdate }) => TrackMutationResult;
  children?: ReactNode;
};

export function TrackBaseSettings({
  track,
  displayOptions,
  updateTrack,
  children,
}: TrackBaseSettingsProps) {
  const [displayError, setDisplayError] = useState<string>();
  return (
    <TrackSettingsSection title="Track base settings">
      <TrackSettingsFieldRow>
        <TrackSettingsTextField
          label="Title"
          required
          value={track.base.title}
          validate={(title) => (title.trim() === "" ? "Enter a title." : undefined)}
          onCommit={(title) => updateTrack({ base: { title } })}
        />
        <TrackSettingsColorField
          label="Color"
          value={track.base.color}
          onCommit={(color) => updateTrack({ base: { color } })}
        />
      </TrackSettingsFieldRow>
      {displayOptions.length > 1 && (
        <TrackSettingsFieldRow>
          <TextField
            select
            fullWidth
            label="Display mode"
            size="small"
            value={track.base.display}
            error={displayError !== undefined}
            helperText={displayError}
            onChange={(event) => {
              const result = updateTrack({ base: { display: event.target.value } });
              setDisplayError(result.ok ? undefined : result.error);
            }}
          >
            {displayOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </TrackSettingsFieldRow>
      )}
      {children}
    </TrackSettingsSection>
  );
}
