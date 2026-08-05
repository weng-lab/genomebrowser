import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { BaseSettingsProps, TrackBase } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { neutralTrackColor } from "./color";
import { TrackSettingsColorField } from "./trackSettingsColorField";
import { TrackSettingsNumberField } from "./trackSettingsNumberField";
import { TrackSettingsTextField } from "./trackSettingsTextField";
import { TrackSettingsFieldRow } from "./trackSettingsFieldGrid";
import { TrackSettingsLayout } from "./trackSettingsLayout";
import { TrackSettingsSection } from "./trackSettingsSection";

export type TrackBaseSettingsProps = BaseSettingsProps;

export function TrackBaseSettings({ base, displayOptions, updateBase }: TrackBaseSettingsProps) {
  const [error, setError] = useState<string>();

  const applyImmediateUpdate = (partial: Partial<TrackBase>) => {
    const result = updateBase(partial);
    setError(result.ok ? undefined : result.error);
    return result;
  };

  return (
    <TrackSettingsLayout>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TrackSettingsSection title="Track base settings">
        <TrackSettingsFieldRow>
          <TrackSettingsTextField
            label="Title"
            required
            value={base.title}
            validate={(title) => (title.trim() === "" ? "Enter a title." : undefined)}
            onCommit={(title) => updateBase({ title })}
          />
          <TrackSettingsColorField
            fallbackColor={neutralTrackColor}
            label="Color"
            mode="required"
            value={base.color}
            onCommit={(color) => applyImmediateUpdate({ color })}
          />
        </TrackSettingsFieldRow>

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
          <TrackSettingsNumberField
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
