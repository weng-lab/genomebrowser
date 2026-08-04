import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import type { MethylCConfig, TrackSettingsProps, YRange } from "@weng-lab/genomebrowser";
import { useState } from "react";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";

type Strand = keyof MethylCConfig["urls"];
type Channel = keyof MethylCConfig["urls"]["plusStrand"];
type Color = keyof MethylCConfig["colors"];
type RangeValues = Record<keyof YRange, string>;

type RangeDraft = {
  source: MethylCConfig["range"];
  values: RangeValues;
};

type MethylCRangeSettingsProps = {
  range: MethylCConfig["range"];
  updateConfig: TrackSettingsProps<MethylCConfig>["updateConfig"];
};

const strands: ReadonlyArray<{ key: Strand; title: string; labelPrefix: string }> = [
  { key: "plusStrand", title: "Plus-strand sources", labelPrefix: "Plus-strand" },
  { key: "minusStrand", title: "Minus-strand sources", labelPrefix: "Minus-strand" },
];

const channels: ReadonlyArray<{ key: Channel; label: string }> = [
  { key: "cpg", label: "CpG" },
  { key: "chg", label: "CHG" },
  { key: "chh", label: "CHH" },
  { key: "depth", label: "Depth" },
];

const colors: ReadonlyArray<{ key: Color; label: string }> = [
  { key: "cpg", label: "CpG color" },
  { key: "chg", label: "CHG color" },
  { key: "chh", label: "CHH color" },
  { key: "depth", label: "Depth color" },
];

export function MethylCSettings({ config, updateConfig }: TrackSettingsProps<MethylCConfig>) {
  const updateUrl = (strand: Strand, channel: Channel, url: string) => {
    updateConfig({
      urls: {
        ...config.urls,
        [strand]: {
          ...config.urls[strand],
          [channel]: {
            ...config.urls[strand][channel],
            url,
          },
        },
      },
    });
  };

  const updateColor = (color: Color, value: string) => {
    updateConfig({
      colors: {
        ...config.colors,
        [color]: value,
      },
    });
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {strands.map(({ key, title, labelPrefix }) => (
        <TrackSettingsSection key={key} title={title}>
          <TrackSettingsFieldGrid>
            {channels.map(({ key: channel, label }) => (
              <TextField
                key={channel}
                autoComplete="url"
                fullWidth
                label={`${labelPrefix} ${label} URL`}
                size="small"
                slotProps={{ htmlInput: { inputMode: "url" } }}
                type="url"
                value={config.urls[key][channel].url}
                onChange={(event) => updateUrl(key, channel, event.target.value)}
              />
            ))}
          </TrackSettingsFieldGrid>
        </TrackSettingsSection>
      ))}

      <TrackSettingsSection title="Colors">
        <TrackSettingsFieldGrid>
          {colors.map(({ key, label }) => (
            <TextField
              key={key}
              fullWidth
              label={label}
              placeholder="#000000"
              size="small"
              value={config.colors[key]}
              onChange={(event) => updateColor(key, event.target.value)}
            />
          ))}
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <TrackSettingsSection title="Rendering and range">
        <TrackSettingsFieldGrid>
          <FormControlLabel
            control={
              <Switch
                checked={config.maskCpgByCoverage ?? false}
                size="small"
                onChange={(event) => updateConfig({ maskCpgByCoverage: event.target.checked })}
              />
            }
            label="Mask CpG by coverage"
            sx={{ m: 0, minWidth: 0 }}
          />
        </TrackSettingsFieldGrid>
        <MethylCRangeSettings range={config.range} updateConfig={updateConfig} />
      </TrackSettingsSection>
    </Box>
  );
}

function MethylCRangeSettings({ range, updateConfig }: MethylCRangeSettingsProps) {
  const [draft, setDraft] = useState<RangeDraft>();
  const values = draft && draft.source === range ? draft.values : toRangeValues(range);

  const updateRange = (bound: keyof YRange, value: string) => {
    const nextValues = { ...values, [bound]: value };
    setDraft({ source: range, values: nextValues });

    const nextMin = parseRangeBound(nextValues.min);
    const nextMax = parseRangeBound(nextValues.max);
    if (nextMin === undefined || nextMax === undefined) {
      if (range) updateConfig({ range: undefined });
      return;
    }
    if (nextMin === null || nextMax === null) return;

    updateConfig({ range: { min: nextMin, max: nextMax } });
  };

  const handleAutomaticRangeClick = () => {
    setDraft({ source: range, values: toRangeValues() });
    updateConfig({ range: undefined });
  };

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <TrackSettingsFieldGrid>
        <TextField
          fullWidth
          label="Minimum"
          size="small"
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          value={values.min}
          onChange={(event) => updateRange("min", event.target.value)}
        />
        <TextField
          fullWidth
          label="Maximum"
          size="small"
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          value={values.max}
          onChange={(event) => updateRange("max", event.target.value)}
        />
      </TrackSettingsFieldGrid>
      <Button
        size="small"
        sx={{ justifySelf: "start", textTransform: "none" }}
        type="button"
        onClick={handleAutomaticRangeClick}
      >
        Use automatic range
      </Button>
    </Box>
  );
}

function toRangeValues(range?: YRange): RangeValues {
  return {
    min: range?.min === undefined ? "" : String(range.min),
    max: range?.max === undefined ? "" : String(range.max),
  };
}

function parseRangeBound(value: string): number | null | undefined {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return undefined;

  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}
