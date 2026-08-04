import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { BaseSettingsProps, TrackBase } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { TrackSettingsFieldGrid } from "./trackSettingsFieldGrid";
import { TrackSettingsSection } from "./trackSettingsSection";

export type TrackBaseSettingsProps = BaseSettingsProps;

export function TrackBaseSettings({ base, displayOptions, updateBase }: TrackBaseSettingsProps) {
  const [error, setError] = useState<string>();

  const applyUpdate = (partial: Partial<TrackBase>) => {
    const result = updateBase(partial);
    setError(result.ok ? undefined : result.error);
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TrackSettingsFieldGrid>
        <TextField
          fullWidth
          label="Title"
          size="small"
          value={base.title}
          onChange={(event) => applyUpdate({ title: event.target.value })}
        />
        <TextField
          fullWidth
          label="Color"
          placeholder="#000000"
          size="small"
          value={base.color ?? ""}
          onChange={(event) => applyUpdate({ color: event.target.value || undefined })}
        />
      </TrackSettingsFieldGrid>
      <TrackSettingsSection title="Track display settings">
        <TrackSettingsFieldGrid>
          {displayOptions.length > 1 ? (
            <TextField
              select
              fullWidth
              label="Display mode"
              size="small"
              value={base.display}
              onChange={(event) => applyUpdate({ display: event.target.value })}
            >
              {displayOptions.map((display) => (
                <MenuItem key={display} value={display}>
                  {display}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            fullWidth
            label="Height"
            size="small"
            slotProps={{ htmlInput: { min: 20 } }}
            type="number"
            value={base.height}
            onChange={(event) => {
              const height = Number(event.target.value);
              if (Number.isFinite(height)) applyUpdate({ height: Math.max(20, height) });
            }}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </Box>
  );
}
