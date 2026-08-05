import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { BaseSettingsProps, TrackBase } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { DraftNumberField } from "./draftNumberField";
import { DraftTextField } from "./draftTextField";
import { TrackSettingsFieldRow } from "./trackSettingsFieldGrid";
import { TrackSettingsLayout } from "./trackSettingsLayout";
import { TrackSettingsSection } from "./trackSettingsSection";

export type TrackBaseSettingsProps = BaseSettingsProps;

export function TrackBaseSettings({ base, displayOptions, updateBase }: TrackBaseSettingsProps) {
  const [error, setError] = useState<string>();

  const applyImmediateUpdate = (partial: Partial<TrackBase>) => {
    const result = updateBase(partial);
    setError(result.ok ? undefined : result.error);
  };

  return (
    <TrackSettingsLayout>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TrackSettingsFieldRow>
        <DraftTextField
          label="Title"
          required
          value={base.title}
          validate={(title) => (title.trim() === "" ? "Enter a title." : undefined)}
          onCommit={(title) => updateBase({ title })}
        />
        <TextField
          fullWidth
          label="Color"
          placeholder="#000000"
          size="small"
          value={base.color ?? ""}
          onChange={(event) => applyImmediateUpdate({ color: event.target.value || undefined })}
        />
      </TrackSettingsFieldRow>
      <TrackSettingsSection title="Track display settings">
        <TrackSettingsFieldRow>
          {displayOptions.length > 1 ? (
            <TextField
              select
              fullWidth
              label="Display mode"
              size="small"
              value={base.display}
              onChange={(event) => applyImmediateUpdate({ display: event.target.value })}
            >
              {displayOptions.map((display) => (
                <MenuItem key={display} value={display}>
                  {display}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <DraftNumberField
            label="Height"
            min={20}
            required
            value={base.height}
            validate={(height) => (height >= 20 ? undefined : "Enter a height of at least 20.")}
            onCommit={(height) => updateBase({ height })}
          />
        </TrackSettingsFieldRow>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
