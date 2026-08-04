import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import type { BigWigConfig, TrackSettingsProps, YRange } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";

const defaultClampIndicatorColor = "#ff0000";

type YRangeValues = Record<keyof YRange, string>;

type YRangeDraft = {
  source: BigWigConfig["yRange"];
  values: YRangeValues;
};

type YRangeSettingsProps = {
  yRange: BigWigConfig["yRange"];
  updateConfig: TrackSettingsProps<BigWigConfig>["updateConfig"];
};

export function BigWigSettings({ config, updateConfig }: TrackSettingsProps<BigWigConfig>) {
  const showClampIndicators = config.showClampIndicators ?? true;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <TrackSettingsSection title="BigWig source">
        <TrackSettingsFieldGrid>
          <TextField
            autoComplete="url"
            fullWidth
            label="URL"
            size="small"
            slotProps={{ htmlInput: { inputMode: "url" } }}
            type="url"
            value={config.url}
            onChange={(event) => updateConfig({ url: event.target.value })}
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <YRangeSettings yRange={config.yRange} updateConfig={updateConfig} />

      <TrackSettingsSection title="Rendering">
        <TrackSettingsFieldGrid>
          <FormControlLabel
            control={
              <Switch
                checked={config.fillWithZero ?? false}
                size="small"
                onChange={(event) => updateConfig({ fillWithZero: event.target.checked })}
              />
            }
            label="Fill missing values with zero"
            sx={{ m: 0, minWidth: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showClampIndicators}
                size="small"
                onChange={(event) => updateConfig({ showClampIndicators: event.target.checked })}
              />
            }
            label="Show clamp indicators"
            sx={{ m: 0, minWidth: 0 }}
          />
          <TextField
            disabled={!showClampIndicators}
            fullWidth
            label="Clamp indicator color"
            placeholder={defaultClampIndicatorColor}
            size="small"
            value={config.clampIndicatorColor ?? defaultClampIndicatorColor}
            onChange={(event) =>
              updateConfig({ clampIndicatorColor: event.target.value || undefined })
            }
          />
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </Box>
  );
}

function YRangeSettings({ yRange, updateConfig }: YRangeSettingsProps) {
  const [draft, setDraft] = useState<YRangeDraft>();
  const values = draft && draft.source === yRange ? draft.values : toYRangeValues(yRange);

  const updateYRange = (bound: keyof YRange, value: string) => {
    const nextValues = { ...values, [bound]: value };
    setDraft({ source: yRange, values: nextValues });

    const nextMin = parseRangeBound(nextValues.min);
    const nextMax = parseRangeBound(nextValues.max);
    if (nextMin === undefined || nextMax === undefined) {
      if (yRange) updateConfig({ yRange: undefined });
      return;
    }
    if (nextMin === null || nextMax === null) return;

    updateConfig({ yRange: { min: nextMin, max: nextMax } });
  };

  const useAutomaticRange = () => {
    setDraft({ source: yRange, values: toYRangeValues() });
    updateConfig({ yRange: undefined });
  };

  return (
    <TrackSettingsSection title="Y-axis range">
      <TrackSettingsFieldGrid>
        <TextField
          fullWidth
          label="Minimum"
          size="small"
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          value={values.min}
          onChange={(event) => updateYRange("min", event.target.value)}
        />
        <TextField
          fullWidth
          label="Maximum"
          size="small"
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          value={values.max}
          onChange={(event) => updateYRange("max", event.target.value)}
        />
      </TrackSettingsFieldGrid>
      <Button
        size="small"
        sx={{ justifySelf: "start", textTransform: "none" }}
        type="button"
        onClick={useAutomaticRange}
      >
        Use automatic range
      </Button>
    </TrackSettingsSection>
  );
}

function toYRangeValues(yRange?: YRange): YRangeValues {
  return {
    min: yRange?.min === undefined ? "" : String(yRange.min),
    max: yRange?.max === undefined ? "" : String(yRange.max),
  };
}

function parseRangeBound(value: string): number | null | undefined {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return undefined;

  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}
